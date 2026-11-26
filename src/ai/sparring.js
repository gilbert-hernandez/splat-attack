// The sparring rival: a one-ply greedy player that stands in for the CPU rivals until SA-10. It
// reads only the board it plays, keeps its own small state outside the match, and gives the same
// per-tick inputs as a player, meter included. Unpaced, it also generates stored replays.
import { RULES } from '../config/rules.js';
import { INPUT } from '../core/engine.js';
import { COLUMNS, EMPTY, ROWS, applyGravity, cellAt, isColor, setCell } from '../core/grid.js';
import { DOWN, LEFT, RIGHT, UP, otherCell } from '../core/pair.js';
import { findGroups, splatPoints } from '../core/splat.js';

/** The best { col, orientation } for the state's falling pair. */
export function planPair(state) {
  let best = null;
  for (const orientation of [UP, RIGHT, DOWN, LEFT]) {
    for (let col = 0; col < COLUMNS; col++) {
      const value = evaluate(state, col, orientation);
      if (value !== null && (best === null || value > best.value)) best = { col, orientation, value };
    }
  }
  return best;
}

/** This tick's input toward a plan: turn, then move, then drop. */
export function greedyInput({ pair }, plan) {
  if (plan === null) return INPUT.SOFT_DROP;
  // Plans may become unreachable, so give up once grounded.
  if (pair.budget < RULES.lockBudget) return INPUT.SOFT_DROP;
  if (pair.orientation !== plan.orientation) return INPUT.ROTATE_CW;
  if (pair.col !== plan.col) return pair.col < plan.col ? INPUT.RIGHT : INPUT.LEFT;
  return INPUT.SOFT_DROP;
}

function evaluate(state, col, orientation) {
  const grid = [...state.grid];
  // Drop from the top rows; gravity does the rest.
  const pair = { ...state.pair, col, row: orientation === UP ? 1 : 0, orientation };
  const other = otherCell(pair);
  if (other.col < 0 || other.col >= COLUMNS) return null;
  if (cellAt(grid, col, pair.row) !== EMPTY || cellAt(grid, other.col, other.row) !== EMPTY) return null;
  setCell(grid, col, pair.row, pair.pivot);
  setCell(grid, other.col, other.row, pair.other);
  applyGravity(grid);

  let chain = 0;
  let points = 0;
  for (let groups = findGroups(grid); groups.length > 0; groups = findGroups(grid)) {
    points += splatPoints(groups, ++chain);
    for (const { cells } of groups) for (const cell of cells) setCell(grid, cell.col, cell.row, EMPTY);
    applyGravity(grid);
  }
  return points + shape(grid);
}

/** Rewards neighbors of one color, and keeps the board low, mostly in the spawn column. Gunk counts as height only. */
function shape(grid) {
  let value = 0;
  for (let col = 0; col < COLUMNS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const color = cellAt(grid, col, row);
      if (color === EMPTY) continue;
      const height = ROWS - row;
      value -= height * (col === COLUMNS >> 1 ? 3 : 1);
      if (!isColor(color)) continue;
      if (col + 1 < COLUMNS && cellAt(grid, col + 1, row) === color) value += 20;
      if (row + 1 < ROWS && cellAt(grid, col, row + 1) === color) value += 20;
    }
  }
  return value;
}

/**
 * @typedef {object} Pace
 * @property {number} actEvery
 * @property {number} dropDelay
 * @property {number} rinseAt
 * @property {number} bombRows
 */

/**
 * @typedef {object} Sparring
 * @property {Pace} pace
 * @property {{col: number, orientation: number, value: number} | null} plan
 * @property {number} pairs the board's pair count when the plan was made
 * @property {number} cooldown ticks until the next move or rotation
 * @property {number} waited ticks spent in place before dropping
 */

/**
 * A sparring rival's own state. Keep one per board, next to the match.
 * @param {Partial<Pace>} [pace] overrides RULES.sparring
 * @returns {Sparring}
 */
export function createSparring(pace = {}) {
  return { pace: { ...RULES.sparring, ...pace }, plan: null, pairs: -1, cooldown: 0, waited: 0 };
}

/**
 * The meter bit a full meter calls for: Rinse once enough gunk is pending, or else Bomb when the
 * stack nears the top. 0 otherwise.
 * @param {import('../core/engine.js').State} board
 * @param {Pace} pace
 */
export function meterInput(board, { rinseAt, bombRows }) {
  if (board.meter < RULES.meter.max) return 0;
  if (board.pending >= rinseAt) return INPUT.RINSE;
  for (let row = RULES.hiddenRows; row < RULES.hiddenRows + bombRows; row++) {
    for (let col = 0; col < COLUMNS; col++) if (cellAt(board.grid, col, row) !== EMPTY) return INPUT.BOMB;
  }
  return 0;
}

/**
 * This tick's input for a board. Call it once per tick, before the board steps.
 * @param {Sparring} bot
 * @param {import('../core/engine.js').State} board
 */
export function sparringInput(bot, board) {
  if (board.phase !== 'falling' || !board.pair) return 0;
  if (bot.pairs !== board.pairs) {
    Object.assign(bot, { plan: planPair(board), pairs: board.pairs, cooldown: 0, waited: 0 });
  }
  const meter = meterInput(board, bot.pace);
  const input = meter || greedyInput(board, bot.plan);
  if (input === INPUT.SOFT_DROP) {
    if (bot.waited < bot.pace.dropDelay) {
      bot.waited++;
      return 0;
    }
    return input;
  }
  if (bot.cooldown > 0) {
    bot.cooldown--;
    return 0;
  }
  bot.cooldown = bot.pace.actEvery - 1;
  return input;
}
