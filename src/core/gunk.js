import { RULES } from '../config/rules.js';
import { COLUMNS, CRACKED, EMPTY, GUNK, ROWS, cellAt, idOf, setCell } from './grid.js';
import { nextInt } from './rng.js';

// Gunk: dried paint that never matches. A splat next to it cracks it, a second clears it.

// Mixed into the match seed for each side's gunk stream, so the two boards' drops differ while
// their pairs stay the same.
const SIDE_SALTS = [0x9e3779b9, 0x85ebca6b];

/**
 * A board's gunk stream for this seed and side (0 = player, 1 = rival).
 * @param {number} seed
 * @param {number} side
 */
export function gunkSeed(seed, side) {
  return (seed ^ SIDE_SALTS[side]) >>> 0;
}

/**
 * Drops up to RULES.attack.maxDrop of the state's pending gunk, in place: full rows first, then one
 * gunk in each of several different columns picked by the state's gunk stream. Gunk lands on top of
 * its column; gunk that doesn't fit on the board is lost.
 * @param {{grid: number[], pending: number, gunkRng: number}} state
 * @returns {{col: number, row: number}[]} where each gunk landed, column by column, bottom up
 */
export function dropGunk(state) {
  const count = Math.min(state.pending, RULES.attack.maxDrop);
  state.pending -= count;
  const perColumn = new Array(COLUMNS).fill(Math.floor(count / COLUMNS));
  const columns = Array.from({ length: COLUMNS }, (_, col) => col);
  for (let i = 0; i < count % COLUMNS; i++) {
    const draw = nextInt(state.gunkRng, COLUMNS - i);
    state.gunkRng = draw.rng;
    const pick = i + draw.value;
    [columns[i], columns[pick]] = [columns[pick], columns[i]];
    perColumn[columns[i]]++;
  }
  const cells = [];
  for (let col = 0; col < COLUMNS; col++) {
    let row = ROWS - 1;
    while (row >= 0 && cellAt(state.grid, col, row) !== EMPTY) row--;
    for (let n = 0; n < perColumn[col] && row >= 0; n++, row--) {
      setCell(state.grid, col, row, GUNK);
      cells.push({ col, row });
    }
  }
  return cells;
}

const NEIGHBORS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/**
 * Hits each visible gunk next to a splatted cell once, in place: whole gunk cracks and cracked gunk
 * clears. Call it after the splatted blobs have left the grid. Stains aren't touched.
 * @param {number[]} grid
 * @param {import('./splat.js').Group[]} groups
 * @returns {{cracked: {col: number, row: number}[], cleared: {col: number, row: number}[]}}
 */
export function hitGunk(grid, groups) {
  const hit = new Set();
  const cracked = [];
  const cleared = [];
  for (const { cells } of groups) {
    for (const cell of cells) {
      for (const [dc, dr] of NEIGHBORS) {
        const col = cell.col + dc;
        const row = cell.row + dr;
        if (col < 0 || col >= COLUMNS || row < RULES.hiddenRows || row >= ROWS) continue;
        if (hit.has(idOf(col, row))) continue;
        const value = cellAt(grid, col, row);
        if (value === GUNK) cracked.push({ col, row });
        else if (value === CRACKED) cleared.push({ col, row });
        else continue;
        hit.add(idOf(col, row));
      }
    }
  }
  for (const { col, row } of cracked) setCell(grid, col, row, CRACKED);
  for (const { col, row } of cleared) setCell(grid, col, row, EMPTY);
  return { cracked, cleared };
}
