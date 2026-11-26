import { describe, expect, it } from 'vitest';
import { INPUT, SPAWN, createState, spawn, step } from '../../src/core/engine.js';
import { applyGravity, isFree } from '../../src/core/grid.js';
import { findGroups } from '../../src/core/splat.js';
import { BOARDS, parseBoard, parseStains } from '../../src/debug/boards.js';

const start = (name) => {
  const { text, pair, stains = '' } = BOARDS.find((b) => b.name === name);
  const state = createState(1);
  state.grid = parseBoard(text);
  state.stains = parseStains(stains);
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

  it('stains scores a stain match and paints over another color with the pair dropped in place', () => {
    const state = start('stains');
    const { pairs } = state;
    const splats = [];
    while (state.pairs === pairs) splats.push(...step(state, INPUT.SOFT_DROP).filter((e) => e.type === 'splat'));
    expect(splats).toHaveLength(1);
    const [{ groups, points }] = splats;
    expect(groups[0].matched).toHaveLength(2);
    expect(points).toBe(100);
    const bottom = state.stains.slice(-7);
    expect(bottom).toEqual([0, 1, 1, 1, 1, 0, 0]);
  });

  it('gunk cracks one gunk and clears another with the pair dropped at the left wall', () => {
    const state = start('gunk');
    for (let i = 0; i < 3; i++) step(state, INPUT.LEFT);
    const { pairs } = state;
    const hits = [];
    while (state.pairs === pairs) hits.push(...step(state, INPUT.SOFT_DROP).filter((e) => e.type === 'gunkHit'));
    expect(hits).toHaveLength(1);
    expect(hits[0].cracked).toHaveLength(1);
    expect(hits[0].cleared).toHaveLength(1);
  });

  it('top-out ends with the pair dropped in place', () => {
    const state = start('top-out');
    for (let i = 0; i < 100; i++) step(state, INPUT.SOFT_DROP);
    expect(state.phase).toBe('over');
  });
});

describe('bomb board', () => {
  it('Bombs gunk and blobs, and its fallout splats when the pair locks in place', () => {
    const state = start('bomb');
    state.meter = 100;
    const [bomb] = /** @type {any[]} */ (step(state, INPUT.BOMB));
    expect(bomb.type).toBe('bomb');
    const was = bomb.cells.map((c) => c.was);
    expect(was).toContain(6);
    expect(was).toContain(7);
    expect(was.filter((v) => v >= 1 && v <= 5).length).toBeGreaterThan(0);
    const { pairs } = state;
    const splats = [];
    while (state.pairs === pairs) splats.push(...step(state, INPUT.SOFT_DROP).filter((e) => e.type === 'splat'));
    expect(splats).toHaveLength(1);
    expect(splats[0].groups[0]).toMatchObject({ color: 1 });
    expect(splats[0].groups[0].cells).toHaveLength(4);
  });
});
