import { createGrid, idOf } from './grid.js';

// The Wall: a stain layer shaped like the grid. Each cell is 0 (clean) or the color of the last
// splat there. Stains belong to the wall, so gravity never moves them.

/** A clean stain layer. @returns {number[]} */
export const createStains = createGrid;

/**
 * Stains each splatted cell with its group's color, in place. A cell already stained that color
 * is a stain match and keeps its stain; any other cell takes the new color.
 * @param {number[]} stains
 * @param {import('./splat.js').Group[]} groups
 * @returns {{col: number, row: number}[][]} each group's stain-match cells, in group order
 */
export function applyStains(stains, groups) {
  return groups.map(({ color, cells }) => {
    const matched = [];
    for (const { col, row } of cells) {
      const id = idOf(col, row);
      if (stains[id] === color) matched.push({ col, row });
      else stains[id] = color;
    }
    return matched;
  });
}
