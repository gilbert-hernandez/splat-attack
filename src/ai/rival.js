import { PLANS, RIVALS } from '../config/rivals.js';
import { RULES } from '../config/rules.js';
import { INPUT, SPAWN } from '../core/engine.js';
import { COLUMNS, EMPTY } from '../core/grid.js';
import { nextInt, seedRng } from '../core/rng.js';
import { heightOf, longestChain, onStains, tallest, turnFor } from './evaluate.js';
import { drawPersona, drawPlan, pairProfile } from './persona.js';
import { pick, startPlan, stepPlan } from './planner.js';
import { seen } from './view.js';

// A CPU rival: plans each pair with its profile, within its work budget per tick, then steers to
// its pick through the same per-tick inputs as a player. It sees only what a player could see, and
// its random choices come from its own stream, seeded from its bot seed and its id. In the game the
// bot seed is the match seed, so a replay needs nothing from the bot.
//
// Variety (SA-11): each match it draws a persona (plan, risk, patience, colors, area). Once a pair's
// search is done, its spare units read both boards; the next pair drops a plan that has failed and
// adapts its weights to that reading. Moves rated within its margin of the best are a free choice. A `plain` rival does none of
// this and plays exactly as in SA-10; the sim uses it as the variety baseline.

/** @typedef {(typeof RIVALS)[number]} Profile */

/**
 * @typedef {object} Rival
 * @property {Profile} profile
 * @property {number} rng
 * @property {import('./planner.js').Job | null} job
 * @property {import('./planner.js').Move | null} target
 * @property {number} rank which of the best moves this pair's pick is
 * @property {number} pairs the board's pair count when the plan started
 * @property {boolean} meterFired the meter was fired for this pair
 * @property {number} cooldown ticks until the next move, rotation or meter fire
 * @property {number} waited ticks spent in place before dropping
 * @property {number} units work units spent this tick
 * @property {number} maxUnits the most spent in one tick
 * @property {boolean} plain variety off: plays as in SA-10
 * @property {import('./persona.js').Persona | null} persona
 * @property {import('./persona.js').Plan | null} plan the current plan
 * @property {number} switches plan switches this match
 * @property {number} hold pairs left before a failure is checked again
 * @property {number} setup the longest chain it had set up when the last pair started
 * @property {number} fired the longest chain splatted on its board since the last reading
 * @property {import('./persona.js').Reading | null} reading the last complete reading of the boards
 * @property {import('./persona.js').Reading | null} checked the reading the plan was last checked against
 * @property {number} dry pairs in a row with no blob on a matching stain
 * @property {number} dropDelay ticks in place before dropping, with the persona's patience
 * @property {number} tie the draw among near-equal best moves for this pair
 * @property {number} margin this pair's near-tie margin: the profile's while the board is open, else 0
 */

const POSITIVE = ['actEvery', 'lookahead', 'beam', 'budget'];
/** A build plan's setup must be a chain of at least this many steps before losing it counts. */
const LOST_AT = 4;
const RANGES = ['risk', 'patience', 'colors', 'colorBonus', 'areaBonus'];
const COUNTS = ['riskPercent', 'highStack', 'dryPairs', 'hold', 'openCells'];
const ADAPT = ['threat', 'meter', 'gap', 'gapPoints', 'gunk'];

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
    validateVariety(rival, fail);
  }
}

/** The SA-11 fields: margin, persona ranges, plan weights and adaptation strengths. */
function validateVariety(rival, fail) {
  const natural = (v) => Number.isInteger(v) && v >= 0;
  if (!natural(rival.margin)) fail('margin must be an integer, 0 or more');
  const { vary, adapt } = rival;
  if (!vary || !adapt) fail('needs vary and adapt');
  const plans = Object.entries(vary.plans ?? {});
  if (plans.some(([plan, w]) => !(plan in PLANS) || !natural(w))) fail('vary.plans must be PLANS weights, 0 or more');
  if (plans.reduce((sum, [, w]) => sum + w, 0) !== 100) fail('vary.plans must add up to 100');
  for (const key of RANGES) {
    const range = vary[key];
    const ok = Array.isArray(range) && range.length === 2 && range.every(Number.isInteger) && range[0] <= range[1];
    if (!ok) fail(`vary.${key} must be [min, max] integers with min <= max`);
  }
  if (vary.colors[0] < 1 || vary.colors[1] > 2) fail('vary.colors must be within [1, 2]');
  for (const key of COUNTS) if (!natural(vary[key])) fail(`vary.${key} must be an integer, 0 or more`);
  for (const key of ADAPT) if (!natural(adapt[key])) fail(`adapt.${key} must be an integer, 0 or more`);
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
 * @param {number} seed the bot seed: the match seed in the game
 * @param {{plain?: boolean}} [options] plain: variety off, playing exactly as in SA-10
 * @returns {Rival}
 */
export function createRival(id, seed, { plain = false } = {}) {
  const profile = RIVALS.find((rival) => rival.id === id);
  if (!profile) throw new Error(`Unknown rival: ${id}`);
  let rng = seedRng((seed ^ hashId(id)) >>> 0);
  let persona = null;
  if (!plain) ({ rng, persona } = drawPersona(profile, rng));
  return {
    profile,
    rng,
    plain,
    persona,
    plan: persona?.plan ?? null,
    switches: 0,
    hold: 0,
    setup: 0,
    fired: 0,
    reading: null,
    checked: null,
    dry: 0,
    dropDelay: Math.max(0, profile.pace.dropDelay + (persona?.patience ?? 0)),
    tie: 0,
    margin: 0,
    job: null,
    target: null,
    rank: 0,
    pairs: -1,
    meterFired: false,
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

/** How many cells of a grid are filled. */
function filled(grid) {
  let count = 0;
  for (const cell of grid) if (cell !== EMPTY) count++;
  return count;
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
  // The chain counter is on screen; a rival notes the longest it saw, to tell a fired chain from a lost one.
  bot.fired = Math.max(bot.fired, board.chain);
  if (board.phase !== 'falling' || !board.pair) return 0;
  if (bot.pairs !== board.pairs) {
    Object.assign(bot, {
      job: plan(bot, seen(board, opponent)),
      rank: drawRank(bot),
      target: null,
      pairs: board.pairs,
      meterFired: false,
      cooldown: 0,
      waited: 0,
    });
    if (!bot.plain) {
      const draw = nextInt(bot.rng, 0x40000000);
      bot.rng = draw.rng;
      bot.tie = draw.value;
      // Near-ties are a free choice only on an open board, where they cost least.
      bot.margin = filled(board.grid) <= bot.profile.vary.openCells ? bot.profile.margin : 0;
    }
  }
  // Once grounded the pair is about to lock: planning stops and the best move so far is final.
  const grounded = board.pair.budget < RULES.lockBudget;
  // After the search, the units left over read the boards for the next pair.
  if (!bot.job.done && !grounded) {
    bot.units = stepPlan(bot.job, bot.profile.budget);
    bot.maxUnits = Math.max(bot.maxUnits, bot.units);
  }
  if (bot.target === null && bot.job.searched) {
    bot.target = pick(bot.job, bot.rank, bot.margin, bot.tie);
  } else if (bot.target === null && grounded) bot.target = bot.job.best?.move ?? null;
  // While still planning, it heads for the best move so far but doesn't fire the meter or drop.
  const aim = bot.target ?? bot.job.best?.move ?? null;
  if (aim === null) return 0;
  const input = steerInput(bot, board, aim);
  if (bot.target === null && (input === INPUT.SOFT_DROP || input === INPUT.BOMB || input === INPUT.RINSE)) {
    return inDangerRinse(bot, board) ? paced(bot, INPUT.RINSE) : 0;
  }
  return paced(bot, input);
}

/**
 * Starts a pair's plan. A plain rival plans with its profile. Otherwise a failed plan is dropped and
 * the pair is planned with the profile adapted to the last complete reading of the boards; the next
 * reading is taken with the units left once the search is done, so reading never delays a move.
 * @param {Rival} bot
 * @param {import('./view.js').Seen} view
 */
function plan(bot, view) {
  if (bot.plain) return startPlan(view, bot.profile);
  if (bot.reading && bot.reading !== bot.checked) {
    checkPlan(bot, view, bot.reading);
    bot.checked = bot.reading;
  }
  return startPlan(view, pairProfile(bot.profile, bot.persona, bot.plan, bot.reading), (v) => read(bot, v));
}

/**
 * Reads both boards: their chain setups (a unit per probe step) and what's free to see. Kept only if
 * it finishes before the pair locks.
 * @param {Rival} bot
 * @param {import('./view.js').Seen} view
 */
function* read(bot, view) {
  const setup = yield* longestChain(view.grid);
  const player = view.opponent;
  const threat = player ? yield* longestChain(player.grid) : 0;
  bot.reading = {
    setup,
    fired: bot.fired,
    threat,
    playerStains: player ? onStains(player) : 0,
    playerTallest: player ? tallest(player.grid) : 0,
    playerMeterFull: player ? player.meter === RULES.meter.max : false,
    playerPending: player ? player.pending : 0,
    gap: player ? player.score - view.score : 0,
    pending: view.pending,
  };
  bot.fired = 0;
}

/**
 * Drops the plan if it has failed: a build whose chain was lost without being fired, a paint with
 * no blob on a matching stain for too long while the board has stains, or any build or rush with
 * the stack too high. The new plan is drawn by the profile's weights and kept for `hold` pairs.
 * Call it once per new reading.
 * @param {Rival} bot
 * @param {import('./view.js').Seen} view the board now
 * @param {import('./persona.js').Reading} reading
 */
export function checkPlan(bot, view, reading) {
  const { vary } = bot.profile;
  // Only a real setup (a chain of LOST_AT or more) can be lost.
  const lost = bot.setup >= LOST_AT && bot.setup - reading.setup >= 2 && reading.fired < bot.setup - 1;
  const high = tallest(view.grid) >= vary.highStack;
  // Dry pairs count only once there are stains to paint on.
  const stained = view.stains.some((stain) => stain !== 0);
  if (onStains(view) > 0) bot.dry = 0;
  else if (stained) bot.dry++;
  let failed = false;
  if (bot.hold > 0) bot.hold--;
  else if (bot.plan === 'build') failed = lost || high;
  else if (bot.plan === 'rush') failed = high;
  else if (bot.plan === 'paint') failed = bot.dry >= vary.dryPairs;
  bot.setup = reading.setup;
  if (!failed) return;
  const draw = drawPlan(bot.rng, vary.plans, bot.plan);
  bot.rng = draw.rng;
  if (draw.value === null) return;
  bot.plan = draw.value;
  bot.switches++;
  bot.hold = vary.hold;
  bot.dry = 0;
}

/** True when the rival must Rinse now, whatever its plan: a full meter and too much gunk pending. */
function inDangerRinse(bot, board) {
  const full = board.meter === RULES.meter.max && !board.armed;
  return (
    full && !bot.meterFired && board.pending > 0 && (board.pending >= bot.profile.meter.rinseAt || inDanger(board))
  );
}

/** The next input toward a move: meter first, then turn, then move, then drop. */
function steerInput(bot, board, target) {
  const { pair } = board;
  const full = board.meter === RULES.meter.max && !board.armed;
  if (inDangerRinse(bot, board)) return INPUT.RINSE;
  if (target.meter !== 0 && !bot.meterFired && full) {
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
  const { actEvery } = bot.profile.pace;
  if (input === 0) return 0;
  if (input === INPUT.SOFT_DROP) {
    if (bot.waited < bot.dropDelay) {
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
  if (input === INPUT.RINSE || input === INPUT.BOMB) bot.meterFired = true;
  return input;
}
