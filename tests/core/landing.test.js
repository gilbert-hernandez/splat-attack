import { describe, expect, it } from 'vitest';
import { landingCells } from '../../src/core/landing.js';
import { DOWN, RIGHT, UP } from '../../src/core/pair.js';
import { stateWith } from './fixtures.js';

const land = (text, pair) => {
  const state = stateWith(text, pair);
  return landingCells(state.grid, state.pair);
};

describe('landing cells', () => {
  it('rests each half on its own column', () => {
    expect(land('...y...\n...g...', { orientation: RIGHT })).toEqual([
      { col: 3, row: 11, color: 1 },
      { col: 4, row: 13, color: 4 },
    ]);
  });

  it('keeps a vertical pair in order', () => {
    expect(land('...g...', { orientation: UP }).map((c) => c.row)).toEqual([12, 11]);
    expect(land('...g...', { orientation: DOWN }).map((c) => c.row)).toEqual([11, 12]);
  });

  it('can land in hidden rows', () => {
    const full = new Array(12).fill('....g..').join('\n');
    expect(land(full, { col: 3, orientation: RIGHT, row: 1 })[1].row).toBe(1);
  });
});
