import { COLORS } from '../../src/assets/manifest.js';
import { createState } from '../../src/core/engine.js';
import { COLUMNS, EMPTY, ROWS, cellAt, createGrid, setCell } from '../../src/core/grid.js';
import { UP, otherCell } from '../../src/core/pair.js';

// Boards as text: one line per row, '.' for empty, a color's first letter for a blob (r y g b p).
// Boards are bottom-aligned, so empty rows at the top can be left out. In rendered boards the
// falling pair is in uppercase.

const LETTERS = COLORS.map((c) => c.name[0]).join('');

const lines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** @param {string} text */
export function parseBoard(text) {
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

/** All rows of a grid, with the pair (if any) in uppercase. */
export function renderBoard(grid, pair = null) {
  const rows = [];
  for (let row = 0; row < ROWS; row++) {
    const line = [];
    for (let col = 0; col < COLUMNS; col++) {
      const color = cellAt(grid, col, row);
      line.push(color === EMPTY ? '.' : LETTERS[color - 1]);
    }
    rows.push(line);
  }
  if (pair) {
    const other = otherCell(pair);
    rows[pair.row][pair.col] = LETTERS[pair.pivot - 1].toUpperCase();
    rows[other.row][other.col] = LETTERS[pair.other - 1].toUpperCase();
  }
  return rows.map((line) => line.join('')).join('\n');
}

/** Fills in the rows a fixture left out, so it compares with renderBoard's output. */
export function board(text) {
  const rows = lines(text);
  return [...new Array(Math.max(0, ROWS - rows.length)).fill('.'.repeat(COLUMNS)), ...rows].join('\n');
}

/**
 * A state on a given board. The pair is red (pivot) and blue unless told otherwise.
 * @param {string} text
 * @param {Partial<import('../../src/core/pair.js').Pair>} [pair]
 */
export function stateWith(text, pair = {}) {
  const state = createState(1);
  state.grid = parseBoard(text);
  Object.assign(state.pair, { pivot: 1, other: 4, orientation: UP }, pair);
  return state;
}

export const show = (state) => renderBoard(state.grid, state.pair);
