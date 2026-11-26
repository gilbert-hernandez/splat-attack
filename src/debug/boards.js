import { COLORS } from '../assets/manifest.js';
import { COLUMNS, EMPTY, ROWS, createGrid, setCell } from '../core/grid.js';

// Boards as text: one line per row, '.' for empty, a color's first letter for a blob (r y g b p).
// Boards are bottom-aligned, so empty rows at the top can be left out. Stain layers use the same
// letters, '.' for a clean cell.

export const LETTERS = COLORS.map((c) => c.name[0]).join('');

/** The rows of a board text. */
export const lines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** A grid of blobs. @param {string} text */
export function parseBoard(text) {
  return parseLayer(text);
}

/** A stain layer, which is shaped like a grid. @param {string} text */
export function parseStains(text) {
  return parseLayer(text);
}

function parseLayer(text) {
  const rows = lines(text);
  if (rows.length > ROWS) throw new Error(`Fixture row ${ROWS + 1}: the board has only ${ROWS} rows`);
  const grid = createGrid();
  rows.forEach((line, i) => {
    if (line.length !== COLUMNS) throw new Error(`Fixture row ${i + 1}: "${line}" isn't ${COLUMNS} cells wide`);
    [...line].forEach((letter, col) => {
      const color = LETTERS.indexOf(letter) + 1;
      if (letter !== '.' && color === 0) throw new Error(`Fixture row ${i + 1}: unknown letter "${letter}"`);
      setCell(grid, col, ROWS - rows.length + i, letter === '.' ? EMPTY : color);
    });
  });
  return grid;
}

/**
 * Boards the debug key cycles through. `pair` is the falling pair, [pivot, other]; `stains` is an
 * optional stain layer.
 * @type {{name: string, pair: number[], text: string, stains?: string}[]}
 */
export const BOARDS = [
  {
    // Drop the pair upright at the left wall for a 6-step chain.
    name: 'chain',
    pair: [1, 4],
    text: `
      .ygbpr.
      .rygbpr
      .rygbpr
      .rygbpr`,
  },
  {
    // The next blob left in the center column ends the match.
    name: 'top-out',
    pair: [1, 2],
    text: `
      ...g...
      ..rbp..
      ..pgy..
      .ybpgr.
      .grybp.
      ypbgryg
      rgypbrb
      byrgpyp
      pgbyrgr
      ybprgby
      grypbpg`,
  },
  {
    // Drop the pair in place: the red splat matches two red stains and paints over the blue one.
    name: 'stains',
    pair: [1, 2],
    text: `
      b....gp
      grr.ryb`,
    stains: `
      .rrb...`,
  },
  {
    name: 'mid-game',
    pair: [3, 5],
    text: `
      r.....g
      gy...bp
      rgp.yrb
      ybrgpyg
      pryybgr`,
  },
];
