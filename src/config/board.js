import { RULES } from './rules.js';

// Board drawing. Its size comes from the rules, its place from the layout.
export const BOARD = {
  columns: RULES.columns,
  rows: RULES.visibleRows,
  cell: 32,
  frameBorder: 8,
  fill: 0x1f1c2e,
};
