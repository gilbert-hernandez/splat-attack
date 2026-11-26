import { RULES } from '../config/rules.js';
import { COLUMNS, EMPTY, ROWS, applyGravity, cellAt, setCell } from './grid.js';

// The paint meter: splats fill it, and a full meter fires Rinse (pending gunk gone) or Bomb (a 3×3
// area cleared and stained with the falling pair's pivot color).

/**
 * Meter fill for one chain step.
 * @param {import('./splat.js').Group[]} groups
 * @param {number} chain the step's number, from 1
 */
export function meterFill(groups, chain) {
  const { blobFill, stainFill } = RULES.meter;
  let base = 0;
  for (const { cells, matched = [] } of groups) base += blobFill * cells.length + stainFill * matched.length;
  return base * chain;
}

/**
 * Where a Bomb from this state would go off: the top filled visible cell in the falling pair's pivot
 * column, or that column's bottom row, with the visible cells of the 3×3 area around it. Reads only.
 * @param {{grid: number[], pair: import('./pair.js').Pair | null}} state
 * @returns {{target: {col: number, row: number}, cells: {col: number, row: number}[]} | null} null
 *   without a falling pair
 */
export function bombArea({ grid, pair }) {
  if (!pair) return null;
  const col = pair.col;
  let row = RULES.hiddenRows;
  while (row < ROWS - 1 && cellAt(grid, col, row) === EMPTY) row++;
  const cells = [];
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (c >= 0 && c < COLUMNS && r >= RULES.hiddenRows && r < ROWS) cells.push({ col: c, row: r });
    }
  }
  return { target: { col, row }, cells };
}

/**
 * Sets off a Bomb at the state's falling pair, in place: clears the area, stains it with the pivot's
 * color, and lets everything fall.
 * @param {{grid: number[], stains: number[], pair: import('./pair.js').Pair}} state
 * @returns {{bomb: {type: 'bomb', target: {col: number, row: number},
 *   cells: {col: number, row: number, was: number}[], color: number},
 *   settle: {type: 'settle', falls: {col: number, from: number, to: number, color: number}[]}}}
 */
export function explode(state) {
  const { target, cells } = bombArea(state);
  const color = state.pair.pivot;
  const cleared = cells.map(({ col, row }) => {
    const was = cellAt(state.grid, col, row);
    setCell(state.grid, col, row, EMPTY);
    setCell(state.stains, col, row, color);
    return { col, row, was };
  });
  return {
    bomb: { type: 'bomb', target, cells: cleared, color },
    settle: { type: 'settle', falls: applyGravity(state.grid) },
  };
}
