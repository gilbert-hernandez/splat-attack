import { RULES } from '../config/rules.js';
import { COLUMNS, EMPTY, applyGravity, cellAt, createGrid, setCell } from './grid.js';
import { fallSpeedAt, levelAt } from './level.js';
import { UP, fallPair, isGrounded, movePair, otherCell, rotatePair } from './pair.js';
import { nextInt, seedRng } from './rng.js';
import { dropGunk, gunkSeed, hitGunk } from './gunk.js';
import { explode, meterFill } from './meter.js';
import { findGroups, splatPoints, splatPower } from './splat.js';
import { applyStains, createStains } from './stain.js';

// The rules engine: createState(seed) starts a match, step(state, input) advances it one tick.
// State is plain JSON data, all integers, so it can be copied, compared and replayed.

/** Input bits for one tick. Move and rotate act once per tick they're set; opposites cancel. */
export const INPUT = { LEFT: 1, RIGHT: 2, ROTATE_CW: 4, ROTATE_CCW: 8, SOFT_DROP: 16, RINSE: 32, BOMB: 64 };

/** @typedef {'falling' | 'settling' | 'splatting' | 'over'} Phase */

/**
 * @typedef {object} State
 * @property {number} tick
 * @property {Phase} phase
 * @property {number[]} grid
 * @property {number[]} stains the wall behind the grid: 0 (clean) or a color, never moved by gravity
 * @property {import('./pair.js').Pair | null} pair the falling pair (null unless falling)
 * @property {number[][]} queue next pairs, each [pivot, other]
 * @property {number} rng piece stream
 * @property {number} wait ticks left in the settling or splatting phase
 * @property {number} chain steps so far in the current chain
 * @property {number} chainPoints points so far in the current chain
 * @property {number} score
 * @property {number} pairs pairs spawned so far, including the falling one
 * @property {number} power attack power so far in the current chain
 * @property {number} pending gunk waiting to drop on this board
 * @property {number} gunkRng stream for the columns gunk drops in
 * @property {boolean} dropped true from a gunk drop until the next pair spawns
 * @property {number} meter the paint meter, 0 to RULES.meter.max
 * @property {number} meterLock pairs still to spawn before the meter fills again
 * @property {boolean} armed a Bomb waits for the next falling pair
 */

/**
 * What happened in a tick, for rendering. Events aren't part of the state. A splat's blobs leave
 * the grid at once and stain their cells with the group's color; a gunk hit follows its splat, and
 * cleared gunk leaves at once too. A settle's falls start at once, and the grid already has their
 * end positions. A Bomb's cells leave at once and take its stain color; a settle follows it.
 * @typedef {{type: 'lock', cells: {col: number, row: number, color: number}[]}
 *   | {type: 'settle', falls: {col: number, from: number, to: number, color: number}[]}
 *   | {type: 'splat', chain: number, groups: import('./splat.js').Group[], points: number}
 *   | {type: 'gunkHit', cracked: {col: number, row: number}[], cleared: {col: number, row: number}[]}
 *   | {type: 'attack', gunk: number, cancelled: number, sent: number, pending: number}
 *   | {type: 'drop', cells: {col: number, row: number}[]}
 *   | {type: 'meter', added: number, meter: number}
 *   | {type: 'rinse', removed: number}
 *   | {type: 'bomb', target: {col: number, row: number}, cells: {col: number, row: number, was: number}[], color: number}
 *   | {type: 'chainEnd', chain: number, points: number}
 *   | {type: 'over', score: number}} Event
 */

// The center column's top visible cell. A match ends when it's occupied after a settle.
export const SPAWN = { col: COLUMNS >> 1, row: RULES.hiddenRows };

/**
 * @param {number} seed unsigned 32-bit integer
 * @param {number} [side] 0 for the player, 1 for the rival: both get the same pairs, but different
 *   gunk columns
 * @returns {State}
 */
export function createState(seed, side = 0) {
  /** @type {State} */
  const state = {
    tick: 0,
    phase: 'falling',
    grid: createGrid(),
    stains: createStains(),
    pair: null,
    queue: [],
    rng: seedRng(seed),
    wait: 0,
    chain: 0,
    chainPoints: 0,
    score: 0,
    pairs: 0,
    power: 0,
    pending: 0,
    gunkRng: 0,
    dropped: false,
    meter: 0,
    meterLock: 0,
    armed: false,
  };
  state.gunkRng = gunkSeed(state.rng, side);
  while (state.queue.length < RULES.nextPairs) state.queue.push(drawPair(state));
  spawn(state);
  return state;
}

/**
 * Advances the state one tick, in place.
 * @param {State} state
 * @param {number} [input] INPUT bits
 * @returns {Event[]}
 */
export function step(state, input = 0) {
  /** @type {Event[]} */
  const events = [];
  if (state.phase === 'over') return events;
  state.tick++;
  fireMeter(state, input, events);
  if (state.phase === 'falling') {
    stepPair(state, input, events);
    return events;
  }
  state.wait--;
  if (state.wait > 0) return events;
  if (state.phase === 'splatting') settle(state, events);
  else resolve(state, events);
  return events;
}

/**
 * Fires a full meter on exactly one of the Rinse and Bomb bits. Rinse acts at once and is refused
 * with nothing pending; a Bomb goes off now if a pair is falling, or is armed until one is.
 */
function fireMeter(state, input, events) {
  const rinse = (input & INPUT.RINSE) !== 0;
  const bomb = (input & INPUT.BOMB) !== 0;
  if (rinse !== bomb && state.meter === RULES.meter.max && (bomb || state.pending > 0)) {
    state.meter = 0;
    state.meterLock = RULES.meter.refillPairs;
    if (rinse) {
      events.push({ type: 'rinse', removed: state.pending });
      state.pending = 0;
    } else {
      state.armed = true;
    }
  }
  if (state.armed && state.phase === 'falling') {
    state.armed = false;
    const { bomb: blast, settle: falls } = explode(state);
    events.push(blast, falls);
  }
}

function stepPair(state, input, events) {
  const { grid, pair } = state;
  const softDrop = (input & INPUT.SOFT_DROP) !== 0;
  const move = axis(input, INPUT.LEFT, INPUT.RIGHT);
  const turn = axis(input, INPUT.ROTATE_CCW, INPUT.ROTATE_CW);
  if (move !== 0) movePair(grid, pair, move);
  if (turn !== 0) rotatePair(grid, pair, turn);
  fallPair(grid, pair, softDrop ? RULES.softDropSpeed : fallSpeedAt(levelAt(state.pairs)));

  if (!isGrounded(grid, pair)) return;
  pair.budget = Math.max(0, pair.budget - 1);
  if (softDrop || pair.budget === 0) lock(state, events);
}

/** -1, 0 or 1 from a pair of opposite input bits. */
function axis(input, negative, positive) {
  return ((input & positive) !== 0 ? 1 : 0) - ((input & negative) !== 0 ? 1 : 0);
}

function lock(state, events) {
  const { pair } = state;
  const cells = [
    { col: pair.col, row: pair.row, color: pair.pivot },
    { ...otherCell(pair), color: pair.other },
  ];
  for (const { col, row, color } of cells) setCell(state.grid, col, row, color);
  state.pair = null;
  events.push({ type: 'lock', cells });
  settle(state, events);
}

/** Lets every blob fall, then waits out the settle time. */
function settle(state, events) {
  events.push({ type: 'settle', falls: applyGravity(state.grid) });
  state.phase = 'settling';
  state.wait = RULES.settleTicks;
}

/**
 * After a settle: splats the next chain step, or ends the chain, drops pending gunk once, and brings
 * in the next pair.
 */
function resolve(state, events) {
  const groups = findGroups(state.grid);
  if (groups.length > 0) {
    splat(state, groups, events);
    return;
  }
  if (state.chain > 0) {
    attack(state, events);
    events.push({ type: 'chainEnd', chain: state.chain, points: state.chainPoints });
  }
  state.chain = 0;
  state.chainPoints = 0;
  state.power = 0;
  if (state.pending > 0 && !state.dropped) {
    events.push({ type: 'drop', cells: dropGunk(state) });
    state.dropped = true;
    state.phase = 'settling';
    state.wait = RULES.settleTicks;
    return;
  }
  state.dropped = false;
  spawn(state);
  if (state.phase === 'over') events.push({ type: 'over', score: state.score });
}

/**
 * Turns the chain's power into gunk, which cancels this board's pending gunk first. The rest is
 * `sent`: in versus it goes to the other board, in Endless nowhere.
 */
function attack(state, events) {
  const gunk = Math.floor(state.power / RULES.attack.powerPerGunk);
  if (gunk === 0) return;
  const cancelled = Math.min(gunk, state.pending);
  state.pending -= cancelled;
  events.push({ type: 'attack', gunk, cancelled, sent: gunk - cancelled, pending: state.pending });
}

function splat(state, found, events) {
  const matched = applyStains(state.stains, found);
  const groups = found.map((group, i) => ({ ...group, matched: matched[i] }));
  for (const { cells } of groups) {
    for (const { col, row } of cells) setCell(state.grid, col, row, EMPTY);
  }
  state.chain++;
  const points = splatPoints(groups, state.chain);
  state.chainPoints += points;
  state.score += points;
  state.power += splatPower(groups, state.chain);
  state.phase = 'splatting';
  state.wait = RULES.splatTicks;
  events.push({ type: 'splat', chain: state.chain, groups, points });
  if (state.meterLock === 0 && state.meter < RULES.meter.max) {
    const added = Math.min(meterFill(groups, state.chain), RULES.meter.max - state.meter);
    state.meter += added;
    events.push({ type: 'meter', added, meter: state.meter });
  }
  const hits = hitGunk(state.grid, groups);
  if (hits.cracked.length > 0 || hits.cleared.length > 0) events.push({ type: 'gunkHit', ...hits });
}

/** Brings in the next pair, or ends the match if the spawn cell is blocked. Exported for debug tools. */
export function spawn(state) {
  if (cellAt(state.grid, SPAWN.col, SPAWN.row) !== EMPTY) {
    state.phase = 'over';
    return;
  }
  const [pivot, other] = state.queue.shift();
  state.queue.push(drawPair(state));
  state.pairs++;
  state.meterLock = Math.max(0, state.meterLock - 1);
  state.pair = { pivot, other, ...SPAWN, orientation: UP, progress: 0, budget: RULES.lockBudget };
  state.phase = 'falling';
}

function drawPair(state) {
  const pair = [];
  while (pair.length < 2) {
    const draw = nextInt(state.rng, RULES.colors);
    state.rng = draw.rng;
    pair.push(draw.value + 1);
  }
  return pair;
}
