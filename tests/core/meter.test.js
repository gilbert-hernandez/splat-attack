import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { INPUT, SPAWN, createState, step } from '../../src/core/engine.js';
import { COLUMNS, EMPTY, ROWS, cellAt, createGrid } from '../../src/core/grid.js';
import { bombArea, meterFill } from '../../src/core/meter.js';
import { otherCell } from '../../src/core/pair.js';
import { nextInt } from '../../src/core/rng.js';
import { splatPoints } from '../../src/core/splat.js';
import { createVersus, stepVersus } from '../../src/core/versus.js';
import { board, parseBoard, renderBoard, renderStains, stateWith } from './fixtures.js';

const { SOFT_DROP: SOFT, RINSE, BOMB } = INPUT;
const MAX = RULES.meter.max;
const B = ROWS - 1;
const RED = 1;
const bottomLeft = { col: 0, row: B };
const four = (chain, matched = 0) =>
  meterFill([{ color: RED, cells: new Array(4), matched: new Array(matched) }], chain);

/** Steps until the next pair is falling (or the match is over), collecting events. */
function finish(state, events = []) {
  for (let ticks = 0; state.phase !== 'falling' && state.phase !== 'over'; ticks++) {
    if (ticks > 10000) throw new Error('never settled');
    events.push(...step(state));
  }
  return events;
}

/** Locks the state's pair at once and plays out the chain. */
function play(state, input = 0) {
  return finish(state, step(state, SOFT | input));
}

/** Steps until the chain is splatting. */
function toSplat(state) {
  step(state, SOFT);
  while (state.phase === 'settling') step(state);
  expect(state.phase).toBe('splatting');
}

describe('meter fill', () => {
  it('adds blob and stain fill, times the chain step', () => {
    expect(four(1)).toBe(4 * RULES.meter.blobFill);
    expect(four(3)).toBe(3 * four(1));
    expect(four(1, 2)).toBe(four(1) + 2 * RULES.meter.stainFill);
  });

  it('fills from a splat and reports it', () => {
    const state = stateWith('.rrr...', bottomLeft);
    const events = play(state);
    expect(state.meter).toBe(four(1));
    expect(events.filter((e) => e.type === 'meter')).toEqual([{ type: 'meter', added: four(1), meter: four(1) }]);
  });

  it('stops at the maximum', () => {
    const state = stateWith('.rrr...', bottomLeft);
    state.meter = MAX - 5;
    const events = play(state);
    expect(state.meter).toBe(MAX);
    expect(events.find((e) => e.type === 'meter')).toEqual({ type: 'meter', added: 5, meter: MAX });
    // Full: no more fill, no more events.
    const again = stateWith('.rrr...', bottomLeft);
    again.meter = MAX;
    expect(play(again).some((e) => e.type === 'meter')).toBe(false);
  });

  it('fills only from splats, not gunk hits or drops', () => {
    const state = stateWith('.rrr#..', bottomLeft);
    state.pending = 9;
    play(state);
    expect(state.meter).toBe(four(1));
    state.dropped = false;
    expect(state.pending).toBe(0);
  });
});

describe('firing', () => {
  it('needs a full meter and exactly one bit', () => {
    const below = createState(1);
    below.meter = MAX - 1;
    below.pending = 3;
    expect(step(below, BOMB).some((e) => e.type === 'bomb')).toBe(false);
    expect(step(below, RINSE).some((e) => e.type === 'rinse')).toBe(false);
    expect([below.meter, below.pending]).toEqual([MAX - 1, 3]);

    const both = createState(1);
    both.meter = MAX;
    both.pending = 3;
    expect(step(both, RINSE | BOMB)).toEqual([]);
    expect([both.meter, both.pending, both.armed]).toEqual([MAX, 3, false]);
  });

  it('does nothing once the board is over', () => {
    const state = createState(1);
    Object.assign(state, { meter: MAX, pending: 3, phase: 'over' });
    expect(step(state, RINSE)).toEqual([]);
    expect(step(state, BOMB)).toEqual([]);
    expect(state.meter).toBe(MAX);
  });
});

describe('Rinse', () => {
  it('removes all pending gunk, sending none to the other board', () => {
    const match = createVersus(5);
    const [player, rival] = match.boards;
    Object.assign(player, { meter: MAX, pending: 10 });
    const [events] = stepVersus(match, RINSE, 0);
    expect(events).toContainEqual({ type: 'rinse', removed: 10 });
    expect([player.pending, player.meter, player.meterLock]).toEqual([0, 0, RULES.meter.refillPairs]);
    expect(rival.pending).toBe(0);
  });

  it('acts at once during a chain, which carries on with its power', () => {
    const state = stateWith('.rrr...', bottomLeft);
    toSplat(state);
    Object.assign(state, { meter: MAX, pending: 5 });
    const { chain, power, score, wait } = state;
    expect(step(state, RINSE)).toEqual([{ type: 'rinse', removed: 5 }]);
    expect([state.pending, state.chain, state.power, state.score, state.wait]).toEqual([
      0,
      chain,
      power,
      score,
      wait - 1,
    ]);
    expect(state.phase).toBe('splatting');
    const rest = finish(state);
    expect(rest.some((e) => e.type === 'attack' && e.cancelled > 0)).toBe(false);
  });

  it('is refused with nothing pending, keeping the meter full (always so in Endless)', () => {
    const state = createState(1);
    state.meter = MAX;
    expect(step(state, RINSE)).toEqual([]);
    expect([state.meter, state.meterLock]).toEqual([MAX, 0]);
  });
});

describe('Bomb', () => {
  const STACK = `
    ....p..
    ....y..
    ...yg..
    ..rgb..
    ..bgr..
    ..ryb..`;

  it('clears and stains the 3×3 around the top cell of the pivot column, then lets blobs fall', () => {
    const state = stateWith(STACK);
    state.meter = MAX;
    const events = /** @type {any[]} */ (step(state, BOMB));
    const [bomb, settle] = events;
    expect(bomb).toMatchObject({ type: 'bomb', target: { col: 3, row: 10 }, color: RED });
    expect(bomb.cells).toHaveLength(9);
    expect(bomb.cells.filter((c) => c.was !== EMPTY)).toHaveLength(6);
    expect(settle).toEqual({ type: 'settle', falls: [{ col: 4, from: 8, to: 11, color: 5 }] });
    expect(renderBoard(state.grid)).toBe(board('....p..\n..bgr..\n..ryb..'));
    expect(renderStains(state.stains)).toBe(board('..rrr..\n..rrr..\n..rrr..\n.......\n.......'));
    expect([state.phase, state.meter, state.armed, state.meterLock]).toEqual([
      'falling',
      0,
      false,
      RULES.meter.refillPairs,
    ]);
  });

  it('is clipped by the walls', () => {
    const state = stateWith('r......\nr......', { col: 0 });
    state.meter = MAX;
    const [bomb] = /** @type {any[]} */ (step(state, BOMB));
    expect(bomb.target).toEqual({ col: 0, row: B - 1 });
    expect(bomb.cells).toHaveLength(6);
    expect(renderBoard(state.grid)).toBe(board('.......'));
  });

  it('aims at the bottom row of an empty column', () => {
    const state = stateWith('.......');
    state.meter = MAX;
    const [bomb] = /** @type {any[]} */ (step(state, BOMB));
    expect(bomb.target).toEqual({ col: SPAWN.col, row: B });
    expect(bomb.cells.map((c) => c.row)).toEqual([B - 1, B - 1, B - 1, B, B, B]);
  });

  it('clears whole and cracked gunk', () => {
    const state = stateWith('..#+#..');
    state.meter = MAX;
    step(state, BOMB);
    expect(renderBoard(state.grid)).toBe(board('.......'));
  });

  it('never clears or stains the hidden rows', () => {
    const rows = ['.......', '.r.....', ...new Array(12).fill('g......')];
    const state = stateWith(rows.join('\n'), { col: 0, row: 1 });
    state.meter = MAX;
    const [bomb] = /** @type {any[]} */ (step(state, BOMB));
    expect(bomb.target).toEqual({ col: 0, row: RULES.hiddenRows });
    expect(bomb.cells.every((c) => c.row >= RULES.hiddenRows)).toBe(true);
    expect(state.stains.slice(0, RULES.hiddenRows * COLUMNS).every((s) => s === EMPTY)).toBe(true);
    // The hidden red blob fell, but wasn't cleared.
    expect(state.grid.filter((c) => c === RED)).toHaveLength(1);
  });

  it('shows where it would go off without changing the state', () => {
    const state = stateWith(STACK);
    const before = structuredClone(state);
    expect(bombArea(state).target).toEqual({ col: 3, row: 10 });
    expect(bombArea({ ...state, pair: null })).toBeNull();
    expect(state).toEqual(before);
  });

  it('waits for the next falling pair when fired during a chain', () => {
    const state = stateWith('.rrr...', bottomLeft);
    toSplat(state);
    state.meter = MAX;
    expect(step(state, BOMB)).toEqual([]);
    expect([state.meter, state.armed]).toEqual([0, true]);
    finish(state);
    expect(state.armed).toBe(true);
    const [bomb] = step(state);
    expect(bomb).toMatchObject({ type: 'bomb', target: { col: SPAWN.col } });
    expect(state.armed).toBe(false);
  });

  it('never goes off once the board is over', () => {
    const state = createState(1);
    Object.assign(state, { armed: true, phase: 'over' });
    expect(step(state)).toEqual([]);
  });

  it('never puts the pair on a filled cell, over random matches', () => {
    let bombs = 0;
    for (let seed = 0; seed < 20; seed++) {
      const state = createState(seed);
      let rng = seed + 77;
      while (state.phase !== 'over') {
        const draw = nextInt(rng, 128);
        rng = draw.rng;
        bombs += step(state, draw.value).filter((e) => e.type === 'bomb').length;
        const { pair } = state;
        if (!pair) continue;
        const other = otherCell(pair);
        expect([cellAt(state.grid, pair.col, pair.row), cellAt(state.grid, other.col, other.row)]).toEqual([
          EMPTY,
          EMPTY,
        ]);
      }
    }
    expect(bombs).toBeGreaterThan(0);
  });
});

describe('refill limit', () => {
  it('keeps the meter empty for the next pairs, however long they take', () => {
    const state = stateWith('.rrr...', bottomLeft);
    Object.assign(state, { meter: MAX, pending: 3 });
    play(state, RINSE);
    // The splat right after firing didn't fill it.
    expect([state.meter, state.meterLock]).toEqual([0, RULES.meter.refillPairs - 1]);
    state.grid = createGrid();
    for (let i = 0; i < 300; i++) step(state);
    expect(state.meterLock).toBe(RULES.meter.refillPairs - 1);
  });

  it('fills again once enough pairs have spawned', () => {
    const state = stateWith('.rrr...', bottomLeft);
    state.meterLock = 1;
    play(state);
    expect(state.meter).toBe(0);
    expect(state.meterLock).toBe(0);
    state.grid = parseBoard('.rrr...');
    Object.assign(state.pair, { ...bottomLeft, pivot: RED });
    play(state);
    // On the first splat's stains: four stain matches.
    expect(state.meter).toBe(four(1, 4));
  });
});

describe('score effects', () => {
  it('scores nothing for cells a Bomb clears', () => {
    const state = stateWith('..r.r..\n..rrr..\n..rrr..\n..ggg..');
    state.meter = MAX;
    const events = step(state, BOMB);
    expect(events.find((e) => e.type === 'bomb').cells.filter((c) => c.was === RED)).toHaveLength(8);
    expect([state.score, state.power, state.meter, state.chain]).toEqual([0, 0, 0, 0]);
    expect(events.some((e) => e.type === 'splat' || e.type === 'meter')).toBe(false);
  });

  it("splats a Bomb's fallout as step 1 of the next pair's chain", () => {
    const state = stateWith(
      `...r...
       ...b...
       ..yp...
       ..ybrrr
       ..gbgbg`,
      { col: 2 },
    );
    state.meter = MAX;
    step(state, BOMB);
    expect(renderBoard(state.grid)).toBe(board('...rrrr\n..gbgbg'));
    // Nothing splats until the pair locks.
    expect(state.phase).toBe('falling');
    Object.assign(state.pair, bottomLeft);
    const events = play(state);
    const splats = events.filter((e) => e.type === 'splat');
    expect(splats).toHaveLength(1);
    expect(splats[0].chain).toBe(1);
    expect(splats[0].groups[0].cells).toHaveLength(4);
    expect(state.score).toBe(splatPoints(splats[0].groups, 1));
  });
});
