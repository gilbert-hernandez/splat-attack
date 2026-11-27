import { RIVALS } from '../config/rivals.js';
import { RULES } from '../config/rules.js';
import { INPUT, SPAWN } from '../core/engine.js';
import { COLUMNS } from '../core/grid.js';
import { nextInt, seedRng } from '../core/rng.js';
import { heightOf, turnFor } from './evaluate.js';
import { pick, startPlan, stepPlan } from './planner.js';
import { seen } from './view.js';

// A CPU rival: plans each pair with its profile, within its work budget per tick, then steers to
// its pick through the same per-tick inputs as a player. It sees only what a player could see, and
// its random choices come from its own stream, seeded from the match seed and its id.

/** @typedef {(typeof RIVALS)[number]} Profile */

/**
 * @typedef {object} Rival
 * @property {Profile} profile
 * @property {number} rng
 * @property {import('./planner.js').Job | null} job
 * @property {import('./planner.js').Move | null} target
 * @property {number} rank which of the best moves this pair's pick is
 * @property {number} pairs the board's pair count when the plan started
 * @property {boolean} fired the meter was fired for this pair
 * @property {number} cooldown ticks until the next move, rotation or meter fire
 * @property {number} waited ticks spent in place before dropping
 * @property {number} units work units spent this tick
 * @property {number} maxUnits the most spent in one tick
 */

const POSITIVE = ['actEvery', 'lookahead', 'beam', 'budget'];

/**
 * Throws, naming the rival, when a profile can't be used.
 * @param {Profile[]} rivals
 */
export function validateRivals(rivals) {
  for (const rival of rivals) {
    const fail = (why) => {
      throw new Error(`Rival ${rival.id}: ${why}`);
    };
    const values = { ...rival.pace, lookahead: rival.lookahead, beam: rival.beam, budget: rival.budget };
    for (const key of POSITIVE)
      if (!Number.isInteger(values[key]) || values[key] < 1) fail(`${key} must be a positive integer`);
    if (!Number.isInteger(rival.pace.dropDelay) || rival.pace.dropDelay < 0)
      fail('dropDelay must be an integer, 0 or more');
    if (rival.lookahead > RULES.nextPairs + 1)
      fail(`lookahead ${rival.lookahead} is more than the ${RULES.nextPairs + 1} visible pairs`);
    const weights = rival.pickWeights;
    if (!Array.isArray(weights) || weights.length === 0 || weights.some((w) => !Number.isInteger(w) || w < 0)) {
      fail('pickWeights must be a list of integers, 0 or more');
    }
    if (weights.reduce((sum, w) => sum + w, 0) !== 100) fail('pickWeights must add up to 100');
    for (const [key, w] of Object.entries(rival.weights))
      if (!Number.isInteger(w)) fail(`weight ${key} must be an integer`);
    if (rival.weights.chainSetup < 0) fail('weight chainSetup must not be negative');
    const { at, smallPercent } = rival.fire;
    if (!Number.isInteger(at) || at < 1) fail('fire.at must be a positive integer');
    if (!Number.isInteger(smallPercent) || smallPercent < 0 || smallPercent > 100)
      fail('fire.smallPercent must be 0 to 100');
  }
}

validateRivals(RIVALS);

/**
 * A rival's profile by its number, 1 to RIVALS.length.
 * @param {number} number
 */
export function rivalProfile(number) {
  const profile = RIVALS.find((rival) => rival.number === number);
  if (!profile) throw new Error(`No rival number ${number}`);
  return profile;
}

/** A small hash of a rival id, mixed into its seed. */
function hashId(id) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}

/**
 * A rival's own state for one match. Keep one per board, next to the match.
 * @param {string} id e.g. 'rival3'
 * @param {number} matchSeed
 * @returns {Rival}
 */
export function createRival(id, matchSeed) {
  const profile = RIVALS.find((rival) => rival.id === id);
  if (!profile) throw new Error(`Unknown rival: ${id}`);
  return {
    profile,
    rng: seedRng((matchSeed ^ hashId(id)) >>> 0),
    job: null,
    target: null,
    rank: 0,
    pairs: -1,
    fired: false,
    cooldown: 0,
    waited: 0,
    units: 0,
    maxUnits: 0,
  };
}

/** Draws which of the best moves to play, by the profile's pick weights. */
function drawRank(bot) {
  const draw = nextInt(bot.rng, 100);
  bot.rng = draw.rng;
  let left = draw.value;
  const weights = bot.profile.pickWeights;
  for (let rank = 0; rank < weights.length; rank++) {
    if (left < weights[rank]) return rank;
    left -= weights[rank];
  }
  return weights.length - 1;
}

/** True when the pending gunk would stack the spawn column to the spawn row. */
export function inDanger(board) {
  return heightOf(board.grid, SPAWN.col) + Math.floor((board.pending + COLUMNS - 1) / COLUMNS) >= RULES.visibleRows;
}

/**
 * This tick's input for the rival's board. Call it once per tick, before the board steps. Reads the
 * boards only.
 * @param {Rival} bot
 * @param {import('../core/engine.js').State} board
 * @param {import('../core/engine.js').State | null} [opponent]
 */
export function rivalInput(bot, board, opponent = null) {
  bot.units = 0;
  if (board.phase !== 'falling' || !board.pair) return 0;
  if (bot.pairs !== board.pairs) {
    Object.assign(bot, {
      job: startPlan(seen(board, opponent), bot.profile),
      rank: drawRank(bot),
      target: null,
      pairs: board.pairs,
      fired: false,
      cooldown: 0,
      waited: 0,
    });
  }
  // Once grounded the pair is about to lock: planning stops and the best move so far is final.
  const grounded = board.pair.budget < RULES.lockBudget;
  if (!bot.job.done && !grounded) {
    bot.units = stepPlan(bot.job, bot.profile.budget);
    bot.maxUnits = Math.max(bot.maxUnits, bot.units);
  }
  if (bot.target === null && bot.job.done) bot.target = pick(bot.job, bot.rank);
  else if (bot.target === null && grounded) bot.target = bot.job.best?.move ?? null;
  // While still planning, it heads for the best move so far but doesn't fire the meter or drop.
  const aim = bot.target ?? bot.job.best?.move ?? null;
  if (aim === null) return 0;
  const input = steerInput(bot, board, aim);
  if (bot.target === null && (input === INPUT.SOFT_DROP || input === INPUT.BOMB || input === INPUT.RINSE)) {
    return inDangerRinse(bot, board) ? paced(bot, INPUT.RINSE) : 0;
  }
  return paced(bot, input);
}

/** True when the rival must Rinse now, whatever its plan: a full meter and too much gunk pending. */
function inDangerRinse(bot, board) {
  const full = board.meter === RULES.meter.max && !board.armed;
  return full && !bot.fired && board.pending > 0 && (board.pending >= bot.profile.meter.rinseAt || inDanger(board));
}

/** The next input toward a move: meter first, then turn, then move, then drop. */
function steerInput(bot, board, target) {
  const { pair } = board;
  const full = board.meter === RULES.meter.max && !board.armed;
  if (inDangerRinse(bot, board)) return INPUT.RINSE;
  if (target.meter !== 0 && !bot.fired && full) {
    if (target.meter === INPUT.RINSE) return board.pending > 0 ? INPUT.RINSE : 0;
    if (pair.col !== target.bombCol) return pair.col < target.bombCol ? INPUT.RIGHT : INPUT.LEFT;
    return INPUT.BOMB;
  }
  if (pair.orientation !== target.orientation) {
    return turnFor(pair.orientation, target.orientation) === 1 ? INPUT.ROTATE_CW : INPUT.ROTATE_CCW;
  }
  if (pair.col !== target.col) return pair.col < target.col ? INPUT.RIGHT : INPUT.LEFT;
  return INPUT.SOFT_DROP;
}

/** Holds an input back to the rival's pace: actions once per actEvery ticks, drops after dropDelay. */
function paced(bot, input) {
  const { actEvery, dropDelay } = bot.profile.pace;
  if (input === 0) return 0;
  if (input === INPUT.SOFT_DROP) {
    if (bot.waited < dropDelay) {
      bot.waited++;
      return 0;
    }
    return input;
  }
  if (bot.cooldown > 0) {
    bot.cooldown--;
    return 0;
  }
  bot.cooldown = actEvery - 1;
  if (input === INPUT.RINSE || input === INPUT.BOMB) bot.fired = true;
  return input;
}
