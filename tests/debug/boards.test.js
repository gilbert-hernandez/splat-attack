import { describe, expect, it } from 'vitest';
import { INPUT, SPAWN, createState, spawn, step } from '../../src/core/engine.js';
import { applyGravity, isFree } from '../../src/core/grid.js';
import { findGroups } from '../../src/core/splat.js';
import { BOARDS, parseBoard } from '../../src/debug/boards.js';

const start = (name) => {
  const { text, pair } = BOARDS.find((b) => b.name === name);
  const state = createState(1);
  state.grid = parseBoard(text);
  state.queue.unshift(pair);
  spawn(state);
  return state;
};

describe('debug boards', () => {
  it.each(BOARDS)('$name is settled, has no group and leaves the spawn cell free', ({ text }) => {
    const grid = parseBoard(text);
    expect(applyGravity(grid)).toEqual([]);
    expect(findGroups(grid)).toEqual([]);
    expect(isFree(grid, SPAWN.col, SPAWN.row)).toBe(true);
  });

  it('chain gives a chain of 5 or more', () => {
    const state = start('chain');
    for (let i = 0; i < 3; i++) step(state, INPUT.LEFT);
    let longest = 0;
    for (let i = 0; i < 400; i++) {
      for (const e of step(state, state.pairs === 2 ? INPUT.SOFT_DROP : 0)) {
        if (e.type === 'splat') longest = Math.max(longest, e.chain);
      }
    }
    expect(longest).toBeGreaterThanOrEqual(5);
  });

  it('top-out ends with the pair dropped in place', () => {
    const state = start('top-out');
    for (let i = 0; i < 100; i++) step(state, INPUT.SOFT_DROP);
    expect(state.phase).toBe('over');
  });
});
