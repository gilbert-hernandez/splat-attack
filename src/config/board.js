import { RULES } from './rules.js';

// Board placement on the 960x540 screen. (x, y) is the top-left of the visible cells.
// Its size comes from the rules.
export const BOARD = {
  columns: RULES.columns,
  rows: RULES.visibleRows,
  cell: 32,
  frameBorder: 8,
  y: 100,
  playerX: 64,
  rivalX: 672,
  soloX: 368,
  fill: 0x1f1c2e,
};
