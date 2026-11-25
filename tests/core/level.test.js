import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { fallSpeedAt, levelAt } from '../../src/core/level.js';
import { stateWith } from './fixtures.js';

describe('speed ramp', () => {
  it.each([
    [1, 1],
    [10, 1],
    [11, 2],
    [20, 2],
    [21, 3],
    [301, 31],
  ])('pair %i is level %i', (pairs, level) => {
    expect(levelAt(pairs)).toBe(level);
  });

  it('rises to the maximum in whole steps, never past soft drop', () => {
    expect(fallSpeedAt(1)).toBe(RULES.fallSpeed);
    expect(fallSpeedAt(2)).toBe(RULES.fallSpeed + RULES.fallSpeedPerLevel);
    for (let level = 1; level <= 100; level++) {
      const speed = fallSpeedAt(level);
      expect(Number.isInteger(speed)).toBe(true);
      expect(speed).toBeGreaterThanOrEqual(fallSpeedAt(Math.max(1, level - 1)));
      expect(speed).toBeLessThanOrEqual(RULES.softDropSpeed);
    }
    expect([fallSpeedAt(30), fallSpeedAt(31), fallSpeedAt(1000)]).toEqual([124, 128, 128]);
  });

  it.each([
    [10, 8],
    [11, 12],
    [1000, 128],
  ])('pair %i falls %i units a tick', (pairs, speed) => {
    const state = stateWith('.......');
    state.pairs = pairs;
    step(state);
    expect(state.pair.progress).toBe(speed);
  });

  it('counts spawned pairs only, whatever the input', () => {
    const play = (input) => {
      const state = createState(5);
      expect(state.pairs).toBe(1);
      let spawns = 1;
      while (state.phase !== 'over' && spawns < 12) {
        const falling = state.phase === 'falling';
        step(state, input);
        if (!falling && state.phase === 'falling') spawns++;
        expect(state.pairs).toBe(spawns);
      }
      return spawns;
    };
    expect(play(0)).toBeGreaterThan(3);
    expect(play(INPUT.SOFT_DROP)).toBeGreaterThan(3);
  });

  it('does not rise during a chain', () => {
    const state = stateWith('.ygbpr.\n.rygbpr\n.rygbpr\n.rygbpr', { col: 0, row: 13 });
    state.pairs = 10;
    step(state, INPUT.SOFT_DROP);
    while (state.phase !== 'falling') {
      expect(levelAt(state.pairs)).toBe(1);
      step(state);
    }
    expect(levelAt(state.pairs)).toBe(2);
  });
});
