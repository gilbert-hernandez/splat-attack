import { RULES } from '../config/rules.js';
import { COLUMNS, EMPTY, applyGravity, cellAt, createGrid, setCell } from './grid.js';
import { UP, fallPair, isGrounded, movePair, otherCell, rotatePair } from './pair.js';
import { nextInt, seedRng } from './rng.js';

// The rules engine: createState(seed) starts a match, step(state, input) advances it one tick.
// State is plain JSON data, all integers, so it can be copied, compared and replayed.

/** Input bits for one tick. Move and rotate act once per tick they're set; opposites cancel. */
export const INPUT = { LEFT: 1, RIGHT: 2, ROTATE_CW: 4, ROTATE_CCW: 8, SOFT_DROP: 16 };

/** @typedef {'falling' | 'settling' | 'over'} Phase */

/**
 * @typedef {object} State
 * @property {number} tick
 * @property {Phase} phase
 * @property {number[]} grid
 * @property {import('./pair.js').Pair | null} pair the falling pair (null unless falling)
 * @property {number[][]} queue next pairs, each [pivot, other]
 * @property {number} rng piece stream
 * @property {number} settleLeft ticks left in the settling phase
 */

// The center column's top visible cell. A match ends when it's occupied after a settle.
export const SPAWN = { col: COLUMNS >> 1, row: RULES.hiddenRows };

/**
 * @param {number} seed unsigned 32-bit integer
 * @returns {State}
 */
export function createState(seed) {
  /** @type {State} */
  const state = {
    tick: 0,
    phase: 'falling',
    grid: createGrid(),
    pair: null,
    queue: [],
    rng: seedRng(seed),
    settleLeft: 0,
  };
  while (state.queue.length < RULES.nextPairs) state.queue.push(drawPair(state));
  spawn(state);
  return state;
}

/**
 * Advances the state one tick, in place.
 * @param {State} state
 * @param {number} [input] INPUT bits
 */
export function step(state, input = 0) {
  if (state.phase === 'over') return;
  state.tick++;
  if (state.phase === 'settling') {
    state.settleLeft--;
    if (state.settleLeft <= 0) spawn(state);
    return;
  }
  stepPair(state, input);
}

function stepPair(state, input) {
  const { grid, pair } = state;
  const softDrop = (input & INPUT.SOFT_DROP) !== 0;
  const move = axis(input, INPUT.LEFT, INPUT.RIGHT);
  const turn = axis(input, INPUT.ROTATE_CCW, INPUT.ROTATE_CW);
  if (move !== 0) movePair(grid, pair, move);
  if (turn !== 0) rotatePair(grid, pair, turn);
  fallPair(grid, pair, softDrop ? RULES.softDropSpeed : RULES.fallSpeed);

  if (!isGrounded(grid, pair)) return;
  pair.budget = Math.max(0, pair.budget - 1);
  if (softDrop || pair.budget === 0) lock(state);
}

/** -1, 0 or 1 from a pair of opposite input bits. */
function axis(input, negative, positive) {
  return ((input & positive) !== 0 ? 1 : 0) - ((input & negative) !== 0 ? 1 : 0);
}

function lock(state) {
  const { grid, pair } = state;
  const other = otherCell(pair);
  setCell(grid, pair.col, pair.row, pair.pivot);
  setCell(grid, other.col, other.row, pair.other);
  applyGravity(grid);
  state.pair = null;
  state.phase = 'settling';
  state.settleLeft = RULES.settleTicks;
}

/** Brings in the next pair, or ends the match if the spawn cell is blocked. */
function spawn(state) {
  if (cellAt(state.grid, SPAWN.col, SPAWN.row) !== EMPTY) {
    state.phase = 'over';
    return;
  }
  const [pivot, other] = state.queue.shift();
  state.queue.push(drawPair(state));
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
