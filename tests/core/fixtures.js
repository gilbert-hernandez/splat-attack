import { createState } from '../../src/core/engine.js';
import { COLUMNS, EMPTY, ROWS, cellAt } from '../../src/core/grid.js';
import { UP, otherCell } from '../../src/core/pair.js';
import { LETTERS, lines, parseBoard, parseStains } from '../../src/debug/boards.js';

// Boards as text (see src/debug/boards.js). In rendered boards the falling pair is in uppercase.

export { parseBoard, parseStains };

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

/** All rows of a stain layer. */
export function renderStains(stains) {
  return renderBoard(stains);
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
 * @param {string} [stains] a stain layer; clean if left out
 */
export function stateWith(text, pair = {}, stains = '') {
  const state = createState(1);
  state.grid = parseBoard(text);
  state.stains = parseStains(stains);
  Object.assign(state.pair, { pivot: 1, other: 4, orientation: UP }, pair);
  return state;
}

export const show = (state) => renderBoard(state.grid, state.pair);
