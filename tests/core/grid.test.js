import { describe, expect, it } from 'vitest';
import { BOARD, RULES } from '../../src/config/index.js';
import { COLUMNS, ROWS, applyGravity, isFree } from '../../src/core/grid.js';
import { board, parseBoard, renderBoard } from './fixtures.js';

describe('grid', () => {
  it('is 7 x 12 visible plus 2 hidden rows, and the screen board agrees', () => {
    expect([COLUMNS, ROWS]).toEqual([7, 14]);
    expect([BOARD.columns, BOARD.rows]).toEqual([RULES.columns, RULES.visibleRows]);
  });

  it('drops floating blobs, keeping their order', () => {
    const grid = parseBoard(`
      r......
      .......
      y.g....
      .......
      b.....p`);
    applyGravity(grid);
    expect(renderBoard(grid)).toBe(
      board(`
      r......
      y......
      b.g...p`),
    );
  });

  it('treats everything off the board as blocked', () => {
    const grid = parseBoard('.......');
    expect(isFree(grid, 0, 0)).toBe(true);
    for (const [col, row] of [
      [-1, 5],
      [7, 5],
      [3, -1],
      [3, 14],
    ]) {
      expect(isFree(grid, col, row)).toBe(false);
    }
  });
});

describe('fixtures', () => {
  it('round-trips a full board', () => {
    const text = new Array(14).fill('rygbp.r').join('\n');
    expect(renderBoard(parseBoard(text))).toBe(text);
  });

  it.each([
    ['an unknown letter', '.......\n...x...', /row 2: unknown letter "x"/],
    ['a short row', '......', /row 1: .* 7 cells/],
    ['too many rows', new Array(15).fill('.......').join('\n'), /row 15: .* 14 rows/],
  ])('rejects %s', (_name, text, message) => {
    expect(() => parseBoard(text)).toThrow(message);
  });
});
