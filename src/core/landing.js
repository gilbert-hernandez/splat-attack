import { EMPTY, ROWS, cellAt } from './grid.js';
import { otherCell } from './pair.js';

/**
 * Where each half of a pair comes to rest if it locks in its current columns: [pivot, other].
 * The grid must be settled.
 * @param {number[]} grid
 * @param {import('./pair.js').Pair} pair
 * @returns {{col: number, row: number, color: number}[]}
 */
export function landingCells(grid, pair) {
  const other = otherCell(pair);
  const pivotRow = restRow(grid, pair.col);
  const otherRow = restRow(grid, other.col);
  const stacked = other.col === pair.col;
  return [
    { col: pair.col, row: pivotRow - (stacked && pair.row < other.row ? 1 : 0), color: pair.pivot },
    { col: other.col, row: otherRow - (stacked && other.row < pair.row ? 1 : 0), color: pair.other },
  ];
}

/** The lowest empty row of a settled column (-1 if full). */
function restRow(grid, col) {
  let row = ROWS - 1;
  while (row >= 0 && cellAt(grid, col, row) !== EMPTY) row--;
  return row;
}
