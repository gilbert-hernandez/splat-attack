import { describe, expect, it } from 'vitest';
import { COLORS } from '../../src/assets/manifest.js';
import { RULES } from '../../src/config/rules.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { COLUMNS, EMPTY, ROWS, cellAt, isFree } from '../../src/core/grid.js';
import { DOWN, LEFT, RIGHT, UP, otherCell } from '../../src/core/pair.js';
import { nextInt } from '../../src/core/rng.js';
import { board, renderBoard, show, stateWith } from './fixtures.js';

const { ROTATE_CW: CW, ROTATE_CCW: CCW, SOFT_DROP: SOFT } = INPUT;
const copy = (state) => JSON.parse(JSON.stringify(state));

/** Steps until a condition holds; returns the ticks taken. */
function until(state, done, input = 0) {
  let ticks = 0;
  while (!done(state)) {
    if (++ticks > 10000) throw new Error('never happened');
    step(state, input);
  }
  return ticks;
}
const landed = (s) => s.phase !== 'falling';

/** Every tick's input is a random mask, deterministic per seed. */
function randomInputs(seed) {
  let rng = seed;
  return () => {
    const draw = nextInt(rng, 32);
    rng = draw.rng;
    return draw.value;
  };
}

describe('pieces', () => {
  it('has one color per blob in the manifest', () => {
    expect(RULES.colors).toBe(COLORS.length);
  });

  it('is the same for a seed however it is played', () => {
    const pairs = (input) => {
      const state = createState(42);
      const list = [];
      for (let i = 0; i < 4; i++) {
        until(state, (s) => s.phase === 'falling');
        list.push([state.pair.pivot, state.pair.other]);
        until(state, landed, input);
      }
      return list;
    };
    expect(pairs(INPUT.LEFT)).toEqual(pairs(SOFT | INPUT.RIGHT));
  });

  it('spawns the first queued pair and refills the queue', () => {
    const state = createState(5);
    expect(state.queue).toHaveLength(2);
    const [first, second] = state.queue;
    until(state, landed, SOFT);
    until(state, (s) => s.phase === 'falling');
    expect([state.pair.pivot, state.pair.other]).toEqual(first);
    expect(state.queue).toHaveLength(2);
    expect(state.queue[0]).toEqual(second);
  });

  it('differs between seeds', () => {
    const openings = new Set(Array.from({ length: 50 }, (_, seed) => JSON.stringify(createState(seed).queue)));
    expect(openings.size).toBeGreaterThan(35);
  });

  it('rejects an invalid seed', () => {
    expect(() => createState(-1)).toThrow('-1');
  });
});

describe('moving and falling', () => {
  it('spawns upright in the center, its pivot in the top visible row', () => {
    const { pair } = createState(1);
    expect([pair.col, pair.row, pair.orientation]).toEqual([3, 2, UP]);
  });

  it('moves one column per input and stops at the walls', () => {
    const state = stateWith('.......');
    step(state, INPUT.LEFT);
    expect(state.pair.col).toBe(2);
    for (let i = 0; i < 9; i++) step(state, INPUT.LEFT);
    expect(state.pair.col).toBe(0);
    for (let i = 0; i < 9; i++) step(state, INPUT.RIGHT);
    expect(state.pair.col).toBe(6);
  });

  it('is blocked by blobs on either half', () => {
    const tower = `
      ..y....
      ..y....
      ..y....`;
    for (const [row, orientation] of [
      [11, UP],
      [10, DOWN],
    ]) {
      const state = stateWith(tower, { row, orientation });
      step(state, INPUT.LEFT);
      expect(state.pair.col).toBe(3);
    }
    // One row higher, it clears the tower.
    const above = stateWith(tower, { row: 10 });
    step(above, INPUT.LEFT);
    expect(above.pair.col).toBe(2);
  });

  it('ignores opposite inputs', () => {
    const state = stateWith('.......');
    step(state, INPUT.LEFT | INPUT.RIGHT | CW | CCW);
    expect([state.pair.col, state.pair.orientation]).toEqual([3, UP]);
  });

  it('falls one row every rowUnits / fallSpeed ticks', () => {
    const state = stateWith('.......');
    const ticks = RULES.rowUnits / RULES.fallSpeed;
    for (let i = 1; i < ticks; i++) step(state);
    expect(state.pair.row).toBe(2);
    step(state);
    expect(state.pair.row).toBe(3);
  });

  it('carries leftover progress into the next row', () => {
    const state = stateWith('.......', { progress: RULES.rowUnits - 3 });
    step(state);
    expect([state.pair.row, state.pair.progress]).toEqual([3, RULES.fallSpeed - 3]);
  });

  it('lands sooner with soft drop', () => {
    const fast = until(stateWith('.......'), landed, SOFT);
    const slow = until(stateWith('.......'), landed);
    expect(fast).toBeLessThan(slow / 4);
  });

  it('keeps its fall progress while crossing a bump', () => {
    const state = stateWith('..y....', { col: 1, row: 12, progress: 100 });
    step(state, INPUT.RIGHT);
    expect([state.pair.col, state.pair.progress, state.pair.budget]).toEqual([2, 100, RULES.lockBudget - 1]);
    step(state, INPUT.RIGHT);
    expect([state.pair.col, state.pair.progress]).toEqual([3, 100 + RULES.fallSpeed]);
  });
});

describe('rotating', () => {
  it('turns through all four orientations both ways', () => {
    for (const [input, order] of /** @type {[number, number[]][]} */ ([
      [CW, [RIGHT, DOWN, LEFT, UP]],
      [CCW, [LEFT, DOWN, RIGHT, UP]],
    ])) {
      const state = stateWith('.......', { row: 6 });
      for (const expected of order) {
        step(state, input);
        expect([state.pair.col, state.pair.row, state.pair.orientation]).toEqual([3, 6, expected]);
      }
      expect(state.pair.budget).toBe(RULES.lockBudget);
    }
  });

  it.each([
    ['right wall', 6, CW, 5, RIGHT],
    ['left wall', 0, CCW, 1, LEFT],
  ])('kicks off the %s', (_name, col, input, expectedCol, orientation) => {
    const state = stateWith('.......', { col, row: 6 });
    step(state, input);
    expect([state.pair.col, state.pair.orientation]).toEqual([expectedCol, orientation]);
  });

  it('kicks off a blob', () => {
    const state = stateWith('....y..\n....y..', { row: 13 });
    step(state, CW);
    expect(show(state)).toBe(board('....y..\n..RBy..'));
  });

  it('kicks up off the floor, spending lock budget', () => {
    const state = stateWith('.......', { row: 13, orientation: RIGHT });
    step(state, CW);
    expect(show(state)).toBe(board('...R...\n...B...'));
    expect(state.pair.budget).toBe(RULES.lockBudget - RULES.floorKickCost - 1);
  });

  it.each([CW, CCW])('flips in a one-wide well (input %i)', (input) => {
    const walls = '..y.y..\n..y.y..\n..y.y..\n..y.y..';
    const state = stateWith(walls, { row: 13 });
    step(state, input);
    // On the floor, the flip also kicks up one row.
    expect(show(state)).toBe(board('..y.y..\n..y.y..\n..yRy..\n..yBy..'));
    step(state, input);
    expect(state.pair.orientation).toBe(UP);
    expect(show(state)).toBe(board('..y.y..\n..yBy..\n..yRy..\n..y.y..'));
  });

  it('flips at a wall too', () => {
    const state = stateWith('.y.....\n.y.....\n.y.....\n.y.....', { col: 0, row: 12 });
    step(state, CCW);
    expect(show(state)).toBe(board('.y.....\n.y.....\nRy.....\nBy.....'));
  });

  it('is never pushed down by the ceiling', () => {
    const state = stateWith('.......', { row: 0, orientation: LEFT });
    step(state, CW);
    expect([state.pair.row, state.pair.orientation]).toEqual([0, LEFT]);
  });

  it('does nothing when there is no room', () => {
    // Top row, on a full column: turning up or kicking up would leave the board.
    const full = new Array(13).fill('yyyyyyy').join('\n');
    for (const [input, orientation] of [
      [CW, RIGHT],
      [CW, LEFT],
      [CCW, RIGHT],
      [CCW, LEFT],
    ]) {
      const state = stateWith(full, { row: 0, orientation });
      step(state, input);
      expect([state.pair.col, state.pair.row, state.pair.orientation]).toEqual([3, 0, orientation]);
      expect(state.pair.budget).toBe(RULES.lockBudget - 1);
    }
  });
});

describe('locking and settling', () => {
  it('allows adjusting until the lock budget runs out', () => {
    const state = stateWith('.......', { row: 13 });
    for (let i = 1; i < RULES.lockBudget; i++) step(state);
    expect(state.phase).toBe('falling');
    const adjusted = copy(state);
    step(adjusted, INPUT.LEFT);
    step(state);
    expect(state.phase).toBe('settling');
    expect(renderBoard(adjusted.grid)).toBe(board('..b....\n..r....'));
  });

  it('locks at once on soft drop', () => {
    const state = stateWith('.......', { row: 13 });
    step(state, SOFT);
    expect(state.phase).toBe('settling');
  });

  it('drops each half onto its own column', () => {
    const state = stateWith('...y...\n...y...', { row: 11, orientation: RIGHT });
    step(state, SOFT);
    expect(show(state)).toBe(board('...r...\n...y...\n...yb..'));
  });

  it('ignores input while settling, then spawns', () => {
    const state = stateWith('.......', { row: 13 });
    step(state, SOFT);
    const settled = show(state);
    for (let i = 1; i < RULES.settleTicks; i++) {
      step(state, INPUT.LEFT | CW | SOFT);
      expect(show(state)).toBe(settled);
    }
    step(state, INPUT.LEFT | CW);
    expect(state.phase).toBe('falling');
    expect([state.pair.col, state.pair.orientation]).toEqual([3, UP]);
  });

  it('cannot be stalled', () => {
    const terrain = 'y......\ny..y...\nyy.y.y.';
    const patterns = [[CW], [CCW], [INPUT.LEFT, INPUT.RIGHT], [CW, CCW], [CW, INPUT.LEFT, CW, INPUT.RIGHT]];
    const bound = (ROWS + RULES.lockBudget) * (RULES.rowUnits / RULES.fallSpeed + 1);
    for (const pattern of patterns) {
      const state = stateWith(terrain);
      let ticks = 0;
      while (state.phase === 'falling' && ticks <= bound) step(state, pattern[ticks++ % pattern.length]);
      expect(ticks, pattern.join()).toBeLessThanOrEqual(bound);
    }
    for (let seed = 0; seed < 200; seed++) {
      const state = stateWith(terrain);
      const next = randomInputs(seed);
      let ticks = 0;
      while (state.phase === 'falling' && ticks++ <= bound) step(state, next() & ~SOFT);
      expect(ticks, `seed ${seed}`).toBeLessThanOrEqual(bound);
    }
  });
});

describe('top-out', () => {
  const column = (rows, line) => new Array(rows).fill(line).join('\n');

  it('ends when the spawn cell is blocked after a settle, then never changes', () => {
    const state = stateWith(column(11, '...y...'));
    step(state, SOFT);
    until(state, (s) => s.phase !== 'settling');
    expect(state.phase).toBe('over');
    expect(state.pair).toBe(null);
    const before = copy(state);
    for (let i = 0; i < 50; i++) step(state, 31);
    expect(state).toEqual(before);
  });

  it('keeps blobs in the hidden rows', () => {
    const state = stateWith(column(11, '...y...'));
    step(state, SOFT);
    expect(show(state).split('\n').slice(0, 3)).toEqual(['.......', '...b...', '...r...']);
  });

  it('continues with other columns full', () => {
    const state = stateWith(column(14, 'yyy.yyy'));
    until(state, landed, SOFT);
    until(state, (s) => s.phase !== 'settling');
    expect(state.phase).toBe('falling');
  });
});

describe('determinism', () => {
  it('gives equal, legal, integer states over random matches', () => {
    for (let seed = 0; seed < 60; seed++) {
      const a = createState(seed);
      const b = createState(seed);
      const next = randomInputs(seed + 1000);
      let restored = null;
      let ticks = 0;
      while (a.phase !== 'over') {
        if (++ticks > 60000) throw new Error(`seed ${seed} never topped out`);
        const input = next();
        step(a, input);
        step(b, input);
        if (restored) step(restored, input);
        if (ticks === 300) restored = copy(a);
        const json = JSON.stringify(a);
        if (JSON.stringify(b) !== json) throw new Error(`seed ${seed} diverged at tick ${ticks}`);
        if (restored && JSON.stringify(restored) !== json) throw new Error(`seed ${seed} copy diverged at ${ticks}`);
        JSON.parse(json, (key, value) => {
          if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error(`${key} is ${value}`);
          return value;
        });
        // JSON turns NaN and Infinity into null, so nothing but `pair` may be null.
        if (/null/.test(json.replace('"pair":null', ''))) throw new Error(`seed ${seed} has a non-number`);
        assertLegal(a);
      }
      expect(restored, `seed ${seed} ended before the copy`).not.toBe(null);
    }
  });
});

function assertLegal({ grid, pair, tick }) {
  if (pair) {
    const other = otherCell(pair);
    if (!isFree(grid, pair.col, pair.row) || !isFree(grid, other.col, other.row)) {
      throw new Error(`Overlap at tick ${tick}:\n${renderBoard(grid)}`);
    }
  }
  for (let col = 0; col < COLUMNS; col++) {
    for (let row = 1; row < ROWS; row++) {
      if (cellAt(grid, col, row) === EMPTY && cellAt(grid, col, row - 1) !== EMPTY) {
        throw new Error(`Floating blob at tick ${tick}:\n${renderBoard(grid)}`);
      }
    }
  }
}
