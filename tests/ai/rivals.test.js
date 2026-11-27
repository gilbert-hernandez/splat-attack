import { describe, expect, it } from 'vitest';
import { rivalProfile, validateRivals } from '../../src/ai/rival.js';
import { seen } from '../../src/ai/view.js';
import { RIVALS } from '../../src/config/rivals.js';
import { RULES } from '../../src/config/rules.js';
import { createVersus } from '../../src/core/versus.js';

const copy = (changes) => [{ ...structuredClone(RIVALS[2]), ...changes }];

describe('rival profiles', () => {
  it('has five rivals, numbered 1 to 5, with distinct style names', () => {
    expect(RIVALS.map((r) => r.id)).toEqual(['rival1', 'rival2', 'rival3', 'rival4', 'rival5']);
    expect(RIVALS.map((r) => r.number)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(RIVALS.map((r) => r.style)).size).toBe(5);
    expect(rivalProfile(4).style).toBe('BUILDER');
    expect(() => rivalProfile(6)).toThrow('No rival number 6');
    expect(() => validateRivals(RIVALS)).not.toThrow();
  });

  it('rejects a lookahead past the visible pairs, naming the rival', () => {
    expect(() => validateRivals(copy({ lookahead: RULES.nextPairs + 2 }))).toThrow(/Rival rival3: lookahead/);
  });

  it('rejects pick weights that do not add up to 100', () => {
    expect(() => validateRivals(copy({ pickWeights: [70, 20] }))).toThrow(/rival3: pickWeights/);
    expect(() => validateRivals(copy({ budget: 0 }))).toThrow(/rival3: budget/);
  });
});

describe('what a rival sees', () => {
  it('copies only the visible state', () => {
    const match = createVersus(7);
    const [player, rival] = match.boards;
    const view = seen(rival, player);
    expect(view).not.toHaveProperty('rng');
    expect(view).not.toHaveProperty('gunkRng');
    expect(view.opponent).not.toHaveProperty('rng');
    expect(view.opponent).not.toHaveProperty('gunkRng');
    expect(view.opponent).not.toHaveProperty('queue');
    expect(view.queue).toEqual(rival.queue.slice(0, RULES.nextPairs));
    expect(view.grid).toEqual(rival.grid);
  });

  it('is a copy: changing it leaves both boards alone', () => {
    const match = createVersus(7);
    const before = structuredClone(match);
    const view = seen(match.boards[1], match.boards[0]);
    view.grid[90] = 3;
    view.stains[0] = 2;
    view.pair.col = 0;
    view.queue[0][0] = 5;
    view.opponent.grid[90] = 3;
    expect(match).toEqual(before);
  });
});
