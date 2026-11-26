import { RULES } from '../config/rules.js';

// The board: a flat array, row 0 is the top hidden row. Cells are 0 (empty), a color (1 to
// RULES.colors, in the manifest's color order), or gunk: whole, or cracked by one hit.

export const COLUMNS = RULES.columns;
export const ROWS = RULES.hiddenRows + RULES.visibleRows;
export const EMPTY = 0;
export const GUNK = RULES.colors + 1;
export const CRACKED = RULES.colors + 2;

/** True for a blob's color, false for empty cells and gunk. */
export function isColor(value) {
  return value > EMPTY && value <= RULES.colors;
}

/** True for whole or cracked gunk. */
export function isGunk(value) {
  return value === GUNK || value === CRACKED;
}

/** @returns {number[]} */
export function createGrid() {
  return new Array(COLUMNS * ROWS).fill(EMPTY);
}

/** A cell's index in a grid-shaped array. */
export function idOf(col, row) {
  return row * COLUMNS + col;
}

export function cellAt(grid, col, row) {
  return grid[idOf(col, row)];
}

export function setCell(grid, col, row, value) {
  grid[idOf(col, row)] = value;
}

/** True when the cell is on the board and empty. */
export function isFree(grid, col, row) {
  return col >= 0 && col < COLUMNS && row >= 0 && row < ROWS && cellAt(grid, col, row) === EMPTY;
}

/**
 * Drops every blob, in place, until it rests on the floor or another blob.
 * @returns {{col: number, from: number, to: number, color: number}[]} the blobs that moved
 */
export function applyGravity(grid) {
  const falls = [];
  for (let col = 0; col < COLUMNS; col++) {
    let target = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row--) {
      const value = cellAt(grid, col, row);
      if (value === EMPTY) continue;
      setCell(grid, col, row, EMPTY);
      setCell(grid, col, target, value);
      if (target !== row) falls.push({ col, from: row, to: target, color: value });
      target--;
    }
  }
  return falls;
}
