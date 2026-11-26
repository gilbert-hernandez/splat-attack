import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { COLUMNS, EMPTY, ROWS, cellAt, createGrid, setCell } from '../../src/core/grid.js';
import { UP } from '../../src/core/pair.js';
import { nextInt } from '../../src/core/rng.js';
import { findGroups, splatPoints } from '../../src/core/splat.js';
import { board, parseBoard, renderBoard, stateWith } from './fixtures.js';

const SOFT = INPUT.SOFT_DROP;
const sizes = (text) => findGroups(parseBoard(text)).map((g) => [g.color, g.cells.length]);
const [RED, YELLOW, GREEN, BLUE] = [1, 2, 3, 4];

describe('matching', () => {
  it.each([
    ['three', 'rrr....', []],
    ['four in a row', 'rrrr...', [[RED, 4]]],
    ['four in a column', 'r......\nr......\nr......\nr......', [[RED, 4]]],
    ['a square', 'rr.....\nrr.....', [[RED, 4]]],
    ['a bend', 'r......\nrrr....\n..r....', [[RED, 5]]],
    ['a U, reached upward', 'r.r....\nrrr....', [[RED, 5]]],
    ['a hollow ring', 'rrr....\nrgr....\nrrr....', [[RED, 8]]],
    ['a full row', 'rrrrrrr', [[RED, 7]]],
    ['a diagonal', '...r...\n..r....\n.r.....\nr......', []],
    ['pairs touching at a corner', 'rr.....\n..rr...', []],
    ['both ends of neighboring rows', '.....rr\nrr.....', []],
    ['the side edges', 'r.....r\nr.....r', []],
    ['two groups of one color', 'rrrr...\nggggg..\nrrrr...', [[RED, 4], [GREEN, 5], [RED, 4]]], // prettier-ignore
    ['several colors', 'yyyy...\nrrrrggg\n....ggg', [[YELLOW, 4], [RED, 4], [GREEN, 6]]], // prettier-ignore
  ])('%s', (_name, text, expected) => {
    expect(sizes(text)).toEqual(expected);
  });

  it('lists each cell once', () => {
    const [{ cells }] = findGroups(parseBoard('rrr....\nrrr....'));
    expect(new Set(cells.map((c) => `${c.col},${c.row}`)).size).toBe(6);
  });

  it('ignores hidden rows', () => {
    const grid = createGrid();
    for (const row of [1, 2, 3, 4]) setCell(grid, 0, row, RED);
    expect(findGroups(grid)).toEqual([]);
    // Two visible halves joined only through a hidden row.
    for (const col of [4, 5]) setCell(grid, col, 1, BLUE);
    for (const row of [2, 3]) for (const col of [4, 6]) setCell(grid, col, row, BLUE);
    setCell(grid, 6, 1, BLUE);
    expect(findGroups(grid)).toEqual([]);
    setCell(grid, 0, 5, RED);
    expect(findGroups(grid)).toMatchObject([{ color: RED, cells: { length: 4 } }]);
  });
});

/** Groups of given [color, size]s; only counts matter to scoring. */
const groups = (...list) =>
  list.map(([color, size]) => ({ color, cells: Array.from({ length: size }, (_, col) => ({ col, row: 0 })) }));

describe('scoring', () => {
  it.each([
    ['four', groups([RED, 4]), 1, 80],
    ['five', groups([RED, 5]), 1, 115],
    ['eight', groups([RED, 8]), 1, 220],
    ['two groups of a color', groups([RED, 4], [RED, 4]), 1, 160],
    ['two colors', groups([RED, 4], [BLUE, 4]), 1, 240],
    ['three colors', groups([RED, 4], [BLUE, 4], [GREEN, 5]), 1, 550],
    ['step 2', groups([RED, 4]), 2, 200],
    ['step 5', groups([RED, 4]), 5, 800],
    ['step 2, two colors, rounded down', groups([RED, 5], [BLUE, 4]), 2, 731],
  ])('%s', (_name, list, chain, points) => {
    expect(splatPoints(list, chain)).toBe(points);
  });

  it.each([8, 12, 16, 20])('pays chains most and one splat least for %i blobs', (blobs) => {
    const count = blobs / 4;
    const fours = Array.from({ length: count }, (_, i) => [i + 1, 4]);
    const single = splatPoints(groups([RED, blobs]), 1);
    const colors = splatPoints(groups(...fours), 1);
    const chain = fours.reduce((sum, four, i) => sum + splatPoints(groups(four), i + 1), 0);
    expect(colors).toBeGreaterThan(single);
    expect(chain).toBeGreaterThan(colors);
  });
});

// A red at the bottom left starts a 6-step chain: each splat drops the next color into place.
const STAIRS = `
  .ygbpr.
  .rygbpr
  .rygbpr
  .rygbpr`;

const CHAIN_POINTS = [80, 200, 360, 560, 800, 1080];
const CHAIN_TOTAL = CHAIN_POINTS.reduce((a, b) => a + b);

/** Locks the pair at once in column 0, red below blue, and returns that tick's events. */
function lockLeft(text) {
  const state = stateWith(text, { col: 0, row: ROWS - 1 });
  return { state, events: step(state, SOFT) };
}

/** Steps until the next pair or the end of the match. Returns [events, ticks]. */
function finish(state, input = 0) {
  const events = [];
  let ticks = 0;
  while (state.phase !== 'falling' && state.phase !== 'over') {
    if (++ticks > 10000) throw new Error('never happened');
    events.push(...step(state, input));
  }
  return { events, ticks };
}

describe('chains', () => {
  it('resolves step by step and scores each', () => {
    const { state } = lockLeft(STAIRS);
    const { events } = finish(state);
    const splats = events.filter((e) => e.type === 'splat');
    expect(splats.map((e) => e.chain)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(splats.map((e) => e.points)).toEqual(CHAIN_POINTS);
    expect(state.score).toBe(CHAIN_TOTAL);
    expect(events.at(-1)).toEqual({ type: 'chainEnd', chain: 6, points: CHAIN_TOTAL });
    expect(renderBoard(state.grid)).toBe(board('b......'));
  });

  it('takes the configured time per step, ignoring input', () => {
    const { state } = lockLeft(STAIRS);
    const other = JSON.parse(JSON.stringify(state));
    const { ticks } = finish(state);
    expect(ticks).toBe(RULES.settleTicks + 6 * (RULES.splatTicks + RULES.settleTicks));
    // Every tick but the spawning one, with random-looking input.
    for (let i = 0; i < ticks; i++) step(other, (i * 7) % 32);
    expect(other).toEqual(state);
  });

  it('can be copied and resumed mid-chain', () => {
    const { state } = lockLeft(STAIRS);
    for (let i = 0; i < 100; i++) step(state);
    expect([state.phase, state.chain]).toEqual(['splatting', 3]);
    const copy = JSON.parse(JSON.stringify(state));
    finish(state);
    finish(copy);
    expect(copy).toEqual(state);
  });

  it('starts again at 1 for the next pair', () => {
    const { state } = lockLeft(STAIRS);
    finish(state);
    expect([state.chain, state.chainPoints]).toEqual([0, 0]);
    state.grid = parseBoard('.rrr...');
    // The chain stained the bottom row; clean it so only the chain number is tested.
    state.stains = createGrid();
    Object.assign(state.pair, { pivot: RED, other: BLUE, col: 0, row: ROWS - 1, orientation: UP });
    step(state, SOFT);
    const { events } = finish(state);
    expect(events.filter((e) => e.type === 'splat')).toMatchObject([{ chain: 1, points: 80 }]);
    expect(state.score).toBe(CHAIN_TOTAL + 80);
  });

  it('splats all groups of a step together', () => {
    const { state } = lockLeft('.yyyy.g\n.rrrggg');
    const { events } = finish(state);
    const first = events.find((e) => e.type === 'splat');
    expect(first.chain).toBe(1);
    expect(first.groups.map((g) => g.color).sort()).toEqual([RED, YELLOW, GREEN].sort());
    expect(first.points).toBe(480);
  });

  it('matches hidden blobs once they fall into view', () => {
    const state = stateWith('.......', { col: 6, row: ROWS - 1 });
    const column = [0, RED, RED, RED, RED, GREEN, BLUE, GREEN, BLUE, GREEN, YELLOW, YELLOW, YELLOW, YELLOW];
    column.forEach((color, row) => setCell(state.grid, 0, row, color));
    step(state, SOFT);
    const splats = finish(state).events.filter((e) => e.type === 'splat');
    expect(splats.map((e) => e.groups.map((g) => g.color))).toEqual([[YELLOW], [RED]]);
    expect(splats[1].groups[0].cells).toHaveLength(4);
  });

  it.each([0, SOFT])('gives no points without a splat (input %i)', (input) => {
    const state = createState(3);
    while (state.phase === 'falling') step(state, input);
    const { events } = finish(state);
    expect(state.score).toBe(0);
    expect(events.map((e) => e.type)).not.toContain('chainEnd');
  });

  it('is saved from a top-out by a splat', () => {
    const tower = ['r', 'r', 'r', 'g', 'b', 'g', 'b', 'g', 'b', 'g', 'b'].map((c) => `...${c}...`).join('\n');
    const state = stateWith(tower);
    step(state, SOFT);
    expect(cellAt(state.grid, 3, RULES.hiddenRows)).toBe(RED);
    finish(state);
    expect(state.phase).toBe('falling');
    expect(state.score).toBe(80);
  });
});

describe('events', () => {
  it('reports a lock and its falls', () => {
    const state = stateWith('...y...\n...y...', { row: ROWS - 3, orientation: 1 });
    expect(step(state, SOFT)).toEqual([
      {
        type: 'lock',
        cells: [
          { col: 3, row: ROWS - 3, color: RED },
          { col: 4, row: ROWS - 3, color: BLUE },
        ],
      },
      { type: 'settle', falls: [{ col: 4, from: ROWS - 3, to: ROWS - 1, color: BLUE }] },
    ]);
  });

  it('reports a splat, then the falls after it', () => {
    const { state } = lockLeft('.rrr...');
    const { events } = finish(state);
    expect(events.map((e) => e.type)).toEqual(['splat', 'settle', 'chainEnd']);
    const cells = [0, 1, 2, 3].map((col) => ({ col, row: ROWS - 1 }));
    expect(events[0].groups).toEqual([{ color: RED, cells, matched: [] }]);
    expect(events[1].falls).toEqual([{ col: 0, from: ROWS - 2, to: ROWS - 1, color: BLUE }]);
  });

  it('reports nothing on quiet ticks and after the match', () => {
    const state = createState(1);
    expect(step(state)).toEqual([]);
    state.phase = 'over';
    expect(step(state, SOFT)).toEqual([]);
  });

  it('is enough to rebuild the board and stains, over random matches', () => {
    let splats = 0;
    let matches = 0;
    for (let seed = 0; seed < 30; seed++) {
      const state = createState(seed);
      const view = createGrid();
      const stains = createGrid();
      let rng = seed + 500;
      let last = null;
      while (state.phase !== 'over') {
        const draw = nextInt(rng, 32);
        rng = draw.rng;
        for (const event of step(state, draw.value)) {
          last = event;
          if (event.type === 'splat') {
            splats++;
            matches += event.groups.reduce((sum, g) => sum + g.matched.length, 0);
            for (const { color, cells } of event.groups)
              for (const { col, row } of cells) setCell(stains, col, row, color);
          }
          apply(view, event);
        }
        if (view.join() !== state.grid.join()) throw new Error(`seed ${seed} differs at tick ${state.tick}`);
        if (stains.join() !== state.stains.join()) throw new Error(`seed ${seed} stains differ at tick ${state.tick}`);
      }
      expect(last).toEqual({ type: 'over', score: state.score });
    }
    expect(splats).toBeGreaterThan(20);
    expect(matches).toBeGreaterThan(0);
  });

  it('cannot affect the match', () => {
    const { state, events } = lockLeft(STAIRS);
    const { state: other } = lockLeft(STAIRS);
    const wreck = (value) => {
      for (const key of Object.keys(value)) {
        if (value[key] && typeof value[key] === 'object') wreck(value[key]);
        value[key] = 99;
      }
    };
    wreck(events);
    for (let i = 0; i < 400; i++) {
      wreck(step(state));
      step(other);
    }
    expect(state).toEqual(other);
  });
});

/** Applies an event to a board, as a view would. */
function apply(view, event) {
  if (event.type === 'lock') for (const { col, row, color } of event.cells) setCell(view, col, row, color);
  if (event.type === 'splat') {
    for (const { cells } of event.groups) for (const { col, row } of cells) setCell(view, col, row, EMPTY);
  }
  if (event.type === 'settle') {
    for (const { col, from } of event.falls) setCell(view, col, from, EMPTY);
    for (const { col, to, color } of event.falls) setCell(view, col, to, color);
  }
  expect(view).toHaveLength(COLUMNS * ROWS);
}
