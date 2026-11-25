// A simple greedy player, only for generating stored replays. It isn't a rival bot.
import { RULES } from '../src/config/rules.js';
import { INPUT } from '../src/core/engine.js';
import { COLUMNS, EMPTY, ROWS, applyGravity, cellAt, setCell } from '../src/core/grid.js';
import { DOWN, LEFT, RIGHT, UP, otherCell } from '../src/core/pair.js';
import { findGroups, splatPoints } from '../src/core/splat.js';

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

/** Rewards neighbors of one color, and keeps the board low, mostly in the spawn column. */
function shape(grid) {
  let value = 0;
  for (let col = 0; col < COLUMNS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const color = cellAt(grid, col, row);
      if (color === EMPTY) continue;
      const height = ROWS - row;
      value -= height * (col === COLUMNS >> 1 ? 3 : 1);
      if (col + 1 < COLUMNS && cellAt(grid, col + 1, row) === color) value += 20;
      if (row + 1 < ROWS && cellAt(grid, col, row + 1) === color) value += 20;
    }
  }
  return value;
}
