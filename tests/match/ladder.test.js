import { describe, expect, it } from 'vitest';
import { nextRival, rivalLabel, rivalNumber } from '../../src/match/ladder.js';

describe('Ladder rival climb', () => {
  it('moves up after a win and wraps after the last rival', () => {
    expect(nextRival(2, 'win')).toBe(3);
    expect(nextRival(5, 'win')).toBe(1);
  });

  it('meets the same rival after a loss or draw', () => {
    expect(nextRival(3, 'loss')).toBe(3);
    expect(nextRival(3, 'draw')).toBe(3);
  });

  it('starts at rival 1 when scene data has no valid rival', () => {
    expect([rivalNumber(undefined), rivalNumber(0), rivalNumber(6), rivalNumber('x'), rivalNumber(4)]).toEqual([
      1, 1, 1, 1, 4,
    ]);
  });

  it('labels a rival by number and style', () => {
    expect(rivalLabel(3)).toBe('RIVAL 3 · PAINTER');
    expect(rivalLabel(4, 'short')).toBe('#4 BUILDER');
  });
});
