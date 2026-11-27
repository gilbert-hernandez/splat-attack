import { describe, expect, it } from 'vitest';
import { land, simulate, steer } from '../../src/ai/evaluate.js';
import { pick, ranked, startPlan, stepPlan } from '../../src/ai/planner.js';
import { seen } from '../../src/ai/view.js';
import { RIVALS } from '../../src/config/rivals.js';
import { RULES } from '../../src/config/rules.js';
import { INPUT } from '../../src/core/engine.js';
import { COLUMNS, ROWS, cellAt } from '../../src/core/grid.js';
import { stateWith } from '../core/fixtures.js';

const ZERO = {
  points: 0,
  attack: 0,
  cancel: 0,
  chainSetup: 0,
  stainMatch: 0,
  stainSetup: 0,
  links: 0,
  height: 0,
  spawnColumn: 0,
  gunk: 0,
};

/** A profile for tests: rival3's, with some fields replaced. */
function profile(changes = {}) {
  const base = structuredClone(RIVALS[2]);
  return { ...base, ...changes, weights: { ...ZERO, ...changes.weights }, meter: { ...base.meter, ...changes.meter } };
}

/** Runs a whole plan at once. */
function plan(state, prof) {
  const job = startPlan(seen(state), prof);
  stepPlan(job, 1000000);
  return job;
}

/** The board after playing a move's placement on the state. */
function after(state, move) {
  const steered = steer(state.grid, state.pair, move.col, move.orientation);
  return simulate(state, land(state.grid, steered));
}

/** The size of the group of `color` that contains a cell. */
function groupAt(grid, col, row, color) {
  const seenCells = new Set();
  const stack = [[col, row]];
  while (stack.length > 0) {
    const [c, r] = stack.pop();
    const id = r * COLUMNS + c;
    if (c < 0 || c >= COLUMNS || r < 0 || r >= ROWS || seenCells.has(id) || cellAt(grid, c, r) !== color) continue;
    seenCells.add(id);
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  return seenCells.size;
}

describe('rival planner', () => {
  it('never spends more units than it is given, and has a best move after the first', () => {
    const state = stateWith('rgb.ypr\ngby.rpg', { pivot: 2, other: 3 });
    const job = startPlan(seen(state), profile({ lookahead: 3, weights: { points: 1, links: 5, height: -1 } }));
    expect(stepPlan(job, 1)).toBe(1);
    expect(job.best).not.toBeNull();
    while (!job.done) expect(stepPlan(job, 7)).toBeLessThanOrEqual(7);
  });

  it('gives the same result however its units are split', () => {
    const state = stateWith('rgb.ypr\ngby.rpg', { pivot: 2, other: 3 });
    const prof = profile({ lookahead: 3, weights: { points: 1, links: 5, height: -1, chainSetup: 3 } });
    const whole = plan(state, prof);
    const bits = startPlan(seen(state), prof);
    while (!bits.done) stepPlan(bits, 1);
    expect(ranked(bits).map((r) => [r.move, r.depth, r.score])).toEqual(
      ranked(whole).map((r) => [r.move, r.depth, r.score]),
    );
    expect(bits.units).toBe(whole.units);
  });

  it('takes a splat it can see', () => {
    const state = stateWith('rrr....', { pivot: 1, other: 4 });
    const move = pick(plan(state, profile({ lookahead: 1, weights: { points: 1 } })), 0);
    expect(after(state, move).chain).toBe(1);
  });

  it('looks ahead: sets up a splat for the next pair that it would skip at lookahead 1', () => {
    // Yellows only splat with the next pair's help, and links cost points: placing a yellow next to
    // the two yellows looks bad alone, but sets up a four with the next pair.
    const state = stateWith('yy.....', { pivot: 2, other: 4 });
    state.queue = [
      [2, 4],
      [3, 5],
    ];
    const weights = { points: 1, links: -5 };
    // A beam wide enough to keep every first move: a narrow one would prune the setup early.
    const near = (move) => groupAt(after(state, move).grid, 0, ROWS - 1, 2);
    expect(near(pick(plan(state, profile({ lookahead: 2, beam: 40, weights })), 0))).toBe(3);
    expect(near(pick(plan(state, profile({ lookahead: 1, beam: 40, weights })), 0))).toBe(2);
  });

  it('only offers meter moves with a full meter', () => {
    const state = stateWith('rgb.ypr', { pivot: 2, other: 3 });
    state.pending = 5;
    const meters = (job) => new Set(job.roots.map((r) => r.move.meter));
    expect(meters(plan(state, profile({ lookahead: 1, weights: { points: 1 } })))).toEqual(new Set([0]));
    state.meter = RULES.meter.max;
    expect(meters(plan(state, profile({ lookahead: 1, weights: { points: 1 } })))).toEqual(
      new Set([0, INPUT.RINSE, INPUT.BOMB]),
    );
    state.pending = 0;
    expect(meters(plan(state, profile({ lookahead: 1, weights: { points: 1 } })))).toEqual(new Set([0, INPUT.BOMB]));
  });

  it('the Painter Bombs a tall mixed stack in the spawn column', () => {
    const tall = 'rgbypgr\nbypgrby\nypgrbyp\npgrbypg\ngrbypgr\nrbypgrb'.split('\n');
    const state = stateWith(['...g...', '...y...', '...b...', ...tall].join('\n'), { pivot: 1, other: 3 });
    state.meter = RULES.meter.max;
    const move = pick(plan(state, RIVALS[2]), 0);
    expect(move.meter).toBe(INPUT.BOMB);
  });

  it('avoids topping out when it has a choice', () => {
    // Column 3 is one blob short of the spawn row; everything else is open.
    const stack = new Array(RULES.visibleRows - 1).fill('...g...');
    stack[stack.length - 1] = '...r...';
    const state = stateWith(stack.map((row, i) => (i % 2 ? row.replace('g', 'y') : row)).join('\n'), {
      pivot: 4,
      other: 5,
    });
    const job = plan(state, profile({ lookahead: 1, weights: { points: 1, spawnColumn: -1 } }));
    const move = pick(job, 0);
    expect(after(state, move).toppedOut).toBe(false);
  });
});
