import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { INPUT, step } from '../../src/core/engine.js';
import { ROWS } from '../../src/core/grid.js';
import { splatPower } from '../../src/core/splat.js';
import { stateWith } from './fixtures.js';

const SOFT = INPUT.SOFT_DROP;
const B = ROWS - 1;
const RED = 1;

/** Locks the pair (red below blue by default) bottom left, then steps until the next pair. */
function play(text, { pending = 0, stains = '', pair = {} } = {}) {
  const state = stateWith(text, { col: 0, row: B, ...pair }, stains);
  state.pending = pending;
  const events = step(state, SOFT);
  for (let ticks = 0; state.phase !== 'falling' && state.phase !== 'over'; ticks++) {
    if (ticks > 10000) throw new Error('never settled');
    events.push(...step(state));
  }
  const attack = events.find((e) => e.type === 'attack') ?? null;
  return { state, events, attack, gunk: attack?.gunk ?? 0 };
}

// Chains of fours: each splat lets the next color fall into a group of four.
const CHAINS = {
  2: `
    .y.....
    .ry....
    .ry....
    .ry....`,
  3: `
    .yg....
    .ryg...
    .ryg...
    .ryg...`,
  4: `
    .ygb...
    .rygb..
    .rygb..
    .rygb..`,
  5: `
    .ygbp..
    .rygbp.
    .rygbp.
    .rygbp.`,
};

const cellsOf = (n) => Array.from({ length: n }, (_, col) => ({ col, row: 0 }));

describe('attack power', () => {
  it('follows the configured formula', () => {
    expect(RULES.attack).toMatchObject({ blobPower: 10, stainPower: 10, powerPerGunk: 70 });
    expect(splatPower([{ color: RED, cells: cellsOf(4) }], 1)).toBe(40);
    expect(splatPower([{ color: RED, cells: cellsOf(4) }], 2)).toBe(100);
    expect(splatPower([{ color: RED, cells: cellsOf(4), matched: cellsOf(2) }], 1)).toBe(60);
    expect(splatPower([{ color: RED, cells: cellsOf(4) }], 5)).toBe(400);
  });

  it('sends nothing for a single four', () => {
    const { attack, events } = play('.rrr...');
    expect(attack).toBeNull();
    expect(events.at(-1).type).toBe('chainEnd');
  });

  it('sends one gunk for a single seven', () => {
    expect(play('.rrrrrr').gunk).toBe(1);
  });

  it.each([
    [2, 2],
    [3, 4],
    [4, 8],
    [5, 14],
  ])('sends the expected gunk for a %i-chain of fours', (chain, gunk) => {
    const result = play(CHAINS[chain]);
    expect(result.events.filter((e) => e.type === 'splat')).toHaveLength(chain);
    expect(result.gunk).toBe(gunk);
  });

  it('pays chains more than one big splat of the same blobs', () => {
    // 12 blobs: a 3-chain of fours against a single splat of twelve.
    const single = play('rrrrrrr\n.rrrr..').gunk;
    expect(play(CHAINS[3]).gunk).toBeGreaterThan(single);
  });

  it('adds power for stain matches', () => {
    // Three of the 2-chain's yellows splat on yellow stains: 40 + (40 + 30) * 2.5 = 215, so 3 gunk
    // instead of 2.
    const stains = `
      ..y....
      ..y....
      ..y....`;
    const plain = play(CHAINS[2]).gunk;
    const stained = play(CHAINS[2], { stains });
    expect(stained.events.filter((e) => e.type === 'splat')[1].groups[0].matched).toHaveLength(3);
    expect(stained.gunk).toBe(3);
    expect(stained.gunk).toBeGreaterThan(plain);
  });

  it('resets after each chain', () => {
    const { state } = play(CHAINS[2]);
    expect(state.power).toBe(0);
  });
});

describe('offsetting', () => {
  it('cancels incoming gunk first', () => {
    const { attack, events } = play(CHAINS[4], { pending: 10 });
    expect(attack).toEqual({ type: 'attack', gunk: 8, cancelled: 8, sent: 0, pending: 2 });
    // The 2 left over drop before the next pair.
    expect(events.find((e) => e.type === 'drop').cells).toHaveLength(2);
  });

  it('sends what is left after cancelling', () => {
    const { attack } = play(CHAINS[4], { pending: 3 });
    expect(attack).toEqual({ type: 'attack', gunk: 8, cancelled: 3, sent: 5, pending: 0 });
  });

  it('comes before the chain end event', () => {
    const types = play(CHAINS[2]).events.map((e) => e.type);
    expect(types.indexOf('attack')).toBe(types.indexOf('chainEnd') - 1);
  });
});
