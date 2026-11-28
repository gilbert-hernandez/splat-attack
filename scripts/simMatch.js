// One headless bot-vs-bot match for `npm run sim`, with what the report needs from it.
import { createRival, rivalInput } from '../src/ai/rival.js';
import { createSparring, sparringInput } from '../src/ai/sparring.js';
import { createVersus, stepVersus } from '../src/core/versus.js';

/** Tick times are counted in buckets this many ms wide, the last bucket holding everything slower. */
export const BUCKET_MS = 0.05;
export const BUCKETS = 400;

/**
 * A bot by name ('sparring' or 'rival1' to 'rival5'), timed per call.
 * @param {string} name
 * @param {number} seed the bot seed
 * @param {{plain?: boolean}} [options] plain: the rival's variety off
 */
function makeBot(name, seed, options = {}) {
  const sparring = name === 'sparring';
  const state = sparring ? createSparring() : createRival(name, seed, options);
  const bot = {
    worstMs: 0,
    /** @type {number[]} how many calls took each bucket's time */
    times: new Array(BUCKETS + 1).fill(0),
    /** @returns {number | null} null for the sparring rival, which has no budget */
    maxUnits: () => (sparring ? null : /** @type {any} */ (state).maxUnits),
    /** @type {any} the rival's own state, or null for the sparring rival */
    rival: sparring ? null : state,
    input(board, opponent) {
      const start = performance.now();
      const input = sparring
        ? sparringInput(/** @type {any} */ (state), board)
        : rivalInput(/** @type {any} */ (state), board, opponent);
      const ms = performance.now() - start;
      bot.worstMs = Math.max(bot.worstMs, ms);
      bot.times[Math.min(BUCKETS, Math.floor(ms / BUCKET_MS))]++;
      return input;
    },
  };
  return bot;
}

function emptyStats() {
  return { score: 0, longestChain: 0, splats: 0, attacks: 0, gunk: 0, stainMatches: 0, rinses: 0, bombs: 0 };
}

/** Adds one tick's events for a board to its stats. */
function count(stats, events) {
  for (const event of events) {
    if (event.type === 'splat') {
      stats.splats++;
      stats.longestChain = Math.max(stats.longestChain, event.chain);
      for (const group of event.groups) stats.stainMatches += group.matched?.length ?? 0;
    }
    if (event.type === 'attack') {
      stats.attacks++;
      stats.gunk += event.gunk;
    }
    if (event.type === 'rinse') stats.rinses++;
    if (event.type === 'bomb') stats.bombs++;
  }
}

/**
 * @typedef {object} MatchRecord
 * @property {number} pairing
 * @property {number} seed
 * @property {number} side the board `a` played: 0 (the player's) or 1
 * @property {'a' | 'b' | 'draw' | 'cut'} winner
 * @property {number} ticks
 * @property {ReturnType<typeof emptyStats> & {maxUnits: number | null, worstMs: number, times: number[]}} a
 * @property {ReturnType<typeof emptyStats> & {maxUnits: number | null, worstMs: number, times: number[]}} b
 */

/**
 * Plays bot `a` against bot `b` on a seed, `a` on board `side`.
 * @param {{pairing: number, a: string, b: string, seed: number, side: number}} job
 * @param {number} maxTicks
 * @returns {MatchRecord}
 */
export function playMatch({ pairing, a, b, seed, side }, maxTicks) {
  const match = createVersus(seed);
  const bots = side === 0 ? [makeBot(a, seed), makeBot(b, seed)] : [makeBot(b, seed), makeBot(a, seed)];
  const stats = [emptyStats(), emptyStats()];
  while (match.outcome === null && match.tick < maxTicks) {
    const [player, rival] = match.boards;
    const inputs = [bots[0].input(player, rival), bots[1].input(rival, player)];
    const events = stepVersus(match, inputs[0], inputs[1]);
    count(stats[0], events[0]);
    count(stats[1], events[1]);
  }
  match.boards.forEach((board, i) => (stats[i].score = board.score));
  const boardOf = (n) => ({
    ...stats[n],
    maxUnits: bots[n].maxUnits(),
    worstMs: bots[n].worstMs,
    times: bots[n].times,
  });
  const [aBoard, bBoard] = side === 0 ? [0, 1] : [1, 0];
  const won = { win: 0, loss: 1 }[match.outcome];
  let winner = /** @type {MatchRecord['winner']} */ ('cut');
  if (match.outcome === 'draw') winner = 'draw';
  else if (won !== undefined) winner = won === aBoard ? 'a' : 'b';
  return { pairing, seed, side, winner, ticks: match.tick, a: boardOf(aBoard), b: boardOf(bBoard) };
}

/** How many of the rival's first placements make up its opening. */
export const OPENING = 8;

/**
 * @typedef {object} VarietyRecord
 * @property {number} rival the rival's number
 * @property {boolean} plain variety off (the baseline)
 * @property {number} botSeed
 * @property {'rival' | 'opponent' | 'draw' | 'cut'} winner
 * @property {number} ticks
 * @property {string[]} opening the rival's first placements, as sorted `col,row,color` cells
 * @property {string | null} plan the persona's starting plan
 * @property {number} switches plan switches
 * @property {number} rivalScore
 * @property {number} opponentScore
 */

/**
 * One match of the variety run: the rival on the rival's board against a fixed opponent (the rival
 * below it, plain, on the piece seed; or the sparring rival), on the piece seed, with its own bot seed.
 * With `stopAfter`, the match stops once the rival has placed that many pairs.
 * @param {{rival: number, pieceSeed: number, botSeed: number, plain: boolean, stopAfter?: number}} job
 * @param {number} maxTicks
 * @returns {VarietyRecord}
 */
export function playVariety({ rival, pieceSeed, botSeed, plain, stopAfter = Infinity }, maxTicks) {
  const match = createVersus(pieceSeed);
  const opponent = rival === 1 ? makeBot('sparring', 0) : makeBot(`rival${rival - 1}`, pieceSeed, { plain: true });
  const bot = makeBot(`rival${rival}`, botSeed, { plain });
  const start = { plan: bot.rival.plan };
  /** @type {string[]} */
  const placements = [];
  while (match.outcome === null && match.tick < maxTicks && placements.length < stopAfter) {
    const [player, board] = match.boards;
    const [, events] = stepVersus(match, opponent.input(player, board), bot.input(board, player));
    for (const event of events) {
      if (event.type !== 'lock') continue;
      placements.push(
        event.cells
          .map((c) => `${c.col},${c.row},${c.color}`)
          .sort()
          .join(';'),
      );
    }
  }
  let winner = /** @type {VarietyRecord['winner']} */ ('cut');
  if (match.outcome === 'draw') winner = 'draw';
  else if (match.outcome === 'loss') winner = 'rival';
  else if (match.outcome === 'win') winner = 'opponent';
  return {
    rival,
    plain,
    botSeed,
    winner,
    ticks: match.tick,
    opening: placements.slice(0, OPENING),
    plan: start.plan,
    switches: bot.rival.switches,
    rivalScore: match.boards[1].score,
    opponentScore: match.boards[0].score,
  };
}
