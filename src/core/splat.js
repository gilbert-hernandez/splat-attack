import { RULES } from '../config/rules.js';
import { COLUMNS, ROWS, cellAt, isColor } from './grid.js';

// Matching and scoring.

/**
 * @typedef {object} Group
 * @property {number} color
 * @property {{col: number, row: number}[]} cells
 * @property {{col: number, row: number}[]} [matched] the cells that splatted on their own stain
 */

/**
 * Every group big enough to splat, in scan order (left to right, top to bottom). Hidden rows are
 * skipped: players can't see those blobs, so they don't match or connect a group. Gunk never matches.
 * @param {number[]} grid
 * @returns {Group[]}
 */
export function findGroups(grid) {
  const seen = new Array(grid.length).fill(false);
  const groups = [];
  for (let row = RULES.hiddenRows; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const color = cellAt(grid, col, row);
      if (!isColor(color) || seen[row * COLUMNS + col]) continue;
      const cells = flood(grid, col, row, seen);
      if (cells.length >= RULES.groupSize) groups.push({ color, cells });
    }
  }
  return groups;
}

/** The cells connected to one, marking them as seen. */
function flood(grid, startCol, startRow, seen) {
  const color = cellAt(grid, startCol, startRow);
  const cells = [];
  const visit = (col, row) => {
    if (col < 0 || col >= COLUMNS || row < RULES.hiddenRows || row >= ROWS) return;
    if (seen[row * COLUMNS + col] || cellAt(grid, col, row) !== color) return;
    seen[row * COLUMNS + col] = true;
    cells.push({ col, row });
  };
  visit(startCol, startRow);
  for (let i = 0; i < cells.length; i++) {
    const { col, row } = cells[i];
    visit(col + 1, row);
    visit(col, row + 1);
    visit(col - 1, row);
    visit(col, row - 1);
  }
  return cells;
}

/**
 * Points for one chain step.
 * @param {Group[]} groups
 * @param {number} chain the step's number, from 1
 */
export function splatPoints(groups, chain) {
  const { blobPoints, extraBlobPoints, colorPercent, chainPercent, chainGrowth, stainPoints } = RULES.scoring;
  let base = 0;
  for (const { cells, matched = [] } of groups) {
    base += blobPoints * cells.length + extraBlobPoints * (cells.length - RULES.groupSize);
    base += stainPoints * matched.length;
  }
  const colors = new Set(groups.map((g) => g.color)).size;
  const color = 100 + colorPercent * (colors - 1);
  const multiplier = chainPercent * chain + chainGrowth * chain * (chain - 1);
  return Math.floor((base * color * multiplier) / 10000);
}

/**
 * Attack power for one chain step.
 * @param {Group[]} groups
 * @param {number} chain the step's number, from 1
 */
export function splatPower(groups, chain) {
  const { blobPower, stainPower, chainPercent, chainGrowth } = RULES.attack;
  let base = 0;
  for (const { cells, matched = [] } of groups) base += blobPower * cells.length + stainPower * matched.length;
  return Math.floor((base * (chainPercent * chain + chainGrowth * chain * (chain - 1))) / 100);
}
