import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { VIEW } from '../../src/config/view.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { DOWN, RIGHT } from '../../src/core/pair.js';
import PairModel from '../../src/view/pairModel.js';
import { stateWith } from '../core/fixtures.js';

function run(state, model, masks) {
  return masks.map((mask) => {
    step(state, mask);
    model.tick(state);
    return model.positions();
  });
}
const idle = (n) => new Array(n).fill(0);

describe('drawn pair', () => {
  it('falls smoothly between rows', () => {
    const state = createState(1);
    const model = new PairModel(state);
    let last = model.positions()[0].y;
    for (const [pivot, other] of run(state, model, idle(100))) {
      expect(pivot.y - last).toBeCloseTo(RULES.fallSpeed / RULES.rowUnits);
      expect(other.y).toBeCloseTo(pivot.y - 1);
      last = pivot.y;
    }
  });

  it('eases a move to its column', () => {
    const state = createState(1);
    const model = new PairModel(state);
    const xs = run(state, model, [INPUT.LEFT, ...idle(VIEW.easeTicks - 1)]).map(([p]) => p.x);
    expect(xs[0]).toBeLessThan(3);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThan(xs[i - 1]);
    expect(xs.at(-1)).toBe(2);
  });

  it('eases a rotation of the other half only', () => {
    const state = createState(1);
    const model = new PairModel(state);
    const drawn = run(state, model, [INPUT.ROTATE_CW, ...idle(VIEW.easeTicks - 1)]);
    expect(drawn[0][0].x).toBe(3);
    expect(drawn[0][1].x).toBeGreaterThan(3);
    expect(drawn[0][1].x).toBeLessThan(4);
    const [pivot, other] = drawn.at(-1);
    expect(other).toEqual({ x: 4, y: pivot.y });
  });

  it('draws a grounded pair on its cells, whatever progress it kept', () => {
    const state = stateWith('', { row: 13, progress: 200 });
    expect(new PairModel(state).positions()).toEqual([
      { x: 3, y: 13 },
      { x: 3, y: 12 },
    ]);
  });

  it('limits the drop when sliding off a ledge', () => {
    const state = stateWith('..g....', { row: 12, col: 2, progress: 200 });
    const model = new PairModel(state);
    const ys = [12, ...run(state, model, [INPUT.RIGHT, ...idle(8)]).map(([p]) => p.y)];
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBeLessThanOrEqual(RULES.softDropSpeed / RULES.rowUnits);
    }
    expect(ys.at(-1)).toBe(13);
  });

  it('eases sliding onto a blob and a floor kick upward', () => {
    const slide = stateWith('..g....', { row: 12, col: 3, progress: 200 });
    const onto = run(slide, new PairModel(slide), [INPUT.LEFT, ...idle(3)]).map(([p]) => p.y);
    expect(onto[0]).toBeGreaterThan(12);
    expect(onto.at(-1)).toBe(12);

    const kick = stateWith('', { row: 13, orientation: RIGHT });
    const drawn = run(kick, new PairModel(kick), [INPUT.ROTATE_CW, ...idle(3)]);
    expect(kick.pair.orientation).toBe(DOWN);
    expect(drawn[0][0].y).toBeGreaterThan(12);
    expect(drawn.at(-1).map((p) => p.y)).toEqual([12, 13]);
  });
});
