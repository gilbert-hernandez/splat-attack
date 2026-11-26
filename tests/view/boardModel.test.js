import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { COLUMNS, CRACKED, EMPTY, GUNK, createGrid } from '../../src/core/grid.js';
import { createReplay, packInputs, playReplay, recordInput } from '../../src/core/replay.js';
import { createVersus, stepVersus } from '../../src/core/versus.js';
import { nextInt, seedRng } from '../../src/core/rng.js';
import BoardModel from '../../src/view/boardModel.js';
import { createSparring, sparringInput } from '../../src/ai/sparring.js';
import { stateWith } from '../core/fixtures.js';

function deepFreeze(value) {
  if (value && typeof value === 'object') Object.values(Object.freeze(value)).forEach(deepFreeze);
  return value;
}
const snapshot = (value) => deepFreeze(structuredClone(value));

/** The grid as drawn. Fails on blobs between cells or sharing one. */
function drawnGrid(model) {
  const grid = createGrid();
  for (const { color, x, y } of model.drawBlobs()) {
    expect([Number.isInteger(x), Number.isInteger(y)]).toEqual([true, true]);
    expect(grid[y * COLUMNS + x]).toBe(EMPTY);
    grid[y * COLUMNS + x] = color;
  }
  return grid;
}

/** The stain layer as drawn. */
function drawnStains(model) {
  const stains = createGrid();
  for (const { col, row, color } of model.drawStains()) stains[row * COLUMNS + col] = color;
  return stains;
}

/** Runs a replay through a model per board on frozen states, checking them at every quiet tick. */
function check(replay) {
  const versus = replay.format === 2;
  const first = versus ? createVersus(replay.seed).boards : [createState(replay.seed)];
  const boards = first.map((state) => ({ model: new BoardModel(snapshot(state)), quiet: 0 }));
  let longest = 0;
  let count = 0;
  playReplay(replay, (match, events) => {
    const states = versus ? match.boards : [match];
    const lists = versus ? events : [events];
    states.forEach((state, side) => checkTick(boards[side], state, lists[side]));
    for (const event of lists[0]) if (event.type === 'splat') longest = Math.max(longest, event.chain);
    count++;
  });
  expect(count).toBeGreaterThan(0);
  return { quiet: Math.min(...boards.map((b) => b.quiet)), longest };
}

function checkTick(board, state, events) {
  const { model } = board;
  model.tick(snapshot(state), snapshot(events));
  // As one settle or splat ends, nothing may still be moving.
  const moved = [...model.blobs.values()].some((b) => model.isFalling(b) && b.fall.start < model.ticks);
  if (events.length > 0) expect(moved).toBe(false);
  if (events.some((e) => e.type === 'settle')) expect([model.splats, model.breaks]).toEqual([[], []]);
  // Rendering every state must work, frozen.
  model.drawBridges();
  model.drawGhost();
  model.drawPair();
  // Stains change only on splat ticks, so they always equal the engine's.
  expect(drawnStains(model)).toEqual(state.stains);
  if (state.phase === 'falling' || state.phase === 'over') {
    board.quiet++;
    if (board.quiet % 7 === 1 || state.phase === 'over') expect(drawnGrid(model)).toEqual(state.grid);
  }
}

function randomReplay(seed) {
  const state = createState(seed);
  const replay = createReplay(seed);
  let rng = seedRng(seed + 1);
  while (state.phase !== 'over') {
    const draw = nextInt(rng, 32);
    rng = draw.rng;
    const mask = draw.value | INPUT.SOFT_DROP;
    recordInput(replay, state, mask);
    step(state, mask);
  }
  return replay;
}

/** A versus match between sparring players of different paces, so gunk flies both ways. */
function sparringReplay(seed) {
  const match = createVersus(seed);
  const replay = createReplay(seed, true);
  const bots = [createSparring({ actEvery: 2, dropDelay: 4 }), createSparring()];
  while (match.outcome === null) {
    const inputs = bots.map((bot, side) => sparringInput(bot, match.boards[side]));
    recordInput(replay, match, packInputs(...inputs));
    stepVersus(match, ...inputs);
  }
  return replay;
}

describe('board model', () => {
  const DIR = new URL('../core/replays/', import.meta.url);
  it.each(readdirSync(DIR))('matches the grid through %s', { timeout: 60000 }, (file) => {
    const { replay } = JSON.parse(readFileSync(new URL(file, DIR), 'utf8'));
    const { quiet } = check(replay);
    expect(quiet).toBeGreaterThan(0);
  });

  it('matches the grid through random matches', { timeout: 60000 }, () => {
    for (let seed = 1; seed <= 10; seed++) check(randomReplay(seed));
  });

  it('matches both grids, gunk included, through sparring matches', { timeout: 60000 }, () => {
    let gunk = 0;
    for (let seed = 1; seed <= 3; seed++) {
      const replay = sparringReplay(seed);
      check(replay);
      playReplay(replay, (_match, events) => {
        for (const e of events.flat()) if (e.type === 'drop' || e.type === 'gunkHit') gunk++;
      });
    }
    expect(gunk).toBeGreaterThan(0);
  });

  it('drops gunk in from above the top edge', () => {
    const state = stateWith('.......');
    state.pair = null;
    state.phase = 'settling';
    state.wait = 1;
    state.pending = 7;
    const model = new BoardModel(state);
    model.tick(state, step(state));
    const gunk = model.drawBlobs().filter((b) => b.color === GUNK);
    expect(gunk).toHaveLength(7);
    for (const b of gunk) expect(b).toMatchObject({ key: 'gunk_whole', y: RULES.hiddenRows - 1 });
    // Lands within the settle time.
    for (let i = 0; i < RULES.settleTicks; i++) model.tick(state, step(state));
    for (const b of model.drawBlobs().filter((d) => d.color === GUNK)) expect(b.y).toBe(13);
  });

  it('cracks gunk on the hit tick and breaks cleared gunk before the next fall', () => {
    const state = stateWith('...+...\n.rrr#..', { col: 0, row: 13 });
    const model = new BoardModel(state);
    model.tick(state, step(state, INPUT.SOFT_DROP));
    while (state.phase === 'settling') model.tick(state, step(state));
    // The splat tick: (4, 13) cracked, (3, 12) cleared and crumbling.
    expect(model.drawBlobs().find((b) => b.x === 4 && b.y === 13)).toMatchObject({
      color: CRACKED,
      key: 'gunk_cracked',
    });
    expect(model.breaks).toEqual([{ col: 3, row: 12, start: model.ticks }]);
    const frames = new Set();
    while (state.phase === 'splatting') {
      for (const b of model.drawBlobs()) if (b.anim === 'break') frames.add(b.frame);
      model.tick(state, step(state));
    }
    expect(model.breaks).toEqual([]);
    expect(frames.size).toBeGreaterThan(1);
  });

  it('never bridges gunk', () => {
    expect(new BoardModel(stateWith('##.....\n##+....')).drawBridges()).toEqual([]);
  });

  it('animates a fall, then a landing, in the settle time', () => {
    const state = stateWith('...g...', { row: 12, orientation: 1 });
    const model = new BoardModel(state);
    const at = () => model.drawBlobs().find((b) => b.color === state.grid[13 * COLUMNS + 4]);
    model.tick(state, step(state, INPUT.SOFT_DROP));
    expect(at()).toMatchObject({ x: 4, y: 12, anim: 'idle' });
    let last = 12;
    for (let i = 0; i < 4; i++) {
      model.tick(state, step(state));
      expect(at().y).toBeGreaterThan(last);
      last = at().y;
    }
    expect(at()).toMatchObject({ y: 13, anim: 'land', frame: 0 });
    // The half that had nowhere to fall lands at once.
    expect(model.drawBlobs().find((b) => b.x === 3 && b.y === 12).anim).toBe('land');
  });

  it('plays the whole splat and removes it before the next fall', () => {
    const state = stateWith('.......\nrrr....', { col: 3, row: 13, other: 2 });
    const model = new BoardModel(state);
    model.tick(state, step(state, INPUT.SOFT_DROP));
    while (state.phase === 'settling') model.tick(state, step(state));
    const frames = new Set();
    for (let i = 0; i < RULES.splatTicks; i++) {
      for (const b of model.drawBlobs()) if (b.anim === 'splat') frames.add(b.frame);
      expect(model.splats).toHaveLength(4);
      model.tick(state, step(state));
    }
    expect([...frames]).toEqual([0, 1, 2, 3, 4]);
    expect(model.splats).toEqual([]);
  });

  it('shows stains from the splat tick, through falls and pauses', () => {
    const state = stateWith('.g.....\nrrr....', { col: 3, row: 13, other: 2 }, 'b......\n.y.....');
    const model = new BoardModel(state);
    // Seeded from the state.
    expect(model.drawStains()).toEqual([
      { col: 0, row: 12, color: 4 },
      { col: 1, row: 13, color: 2 },
    ]);
    model.tick(state, step(state, INPUT.SOFT_DROP));
    while (state.phase === 'settling') model.tick(state, step(state));
    expect(model.splats).toHaveLength(4);
    const after = [0, 1, 2, 3].map((col) => ({ col, row: 13, color: 1 }));
    expect(model.drawStains()).toEqual([{ col: 0, row: 12, color: 4 }, ...after]);
    // Draws without ticking (paused) change nothing; the green falls past the stains.
    expect(model.drawStains()).toEqual(model.drawStains());
    while (state.phase !== 'falling') model.tick(state, step(state));
    expect(model.drawStains()).toEqual([{ col: 0, row: 12, color: 4 }, ...after]);
    expect(drawnStains(model)).toEqual(state.stains);
  });

  it('bridges resting neighbors of one color, not hidden ones or ones across the edge', () => {
    const model = new BoardModel(stateWith('rr.....\nrg....r\ng......'));
    expect(model.drawBridges()).toEqual([
      { color: 1, direction: 'h', x: 1, y: 11.5 },
      { color: 1, direction: 'v', x: 0.5, y: 12 },
    ]);
    const tall = new Array(14).fill('g......').join('\n');
    expect(new BoardModel(stateWith(tall)).drawBridges()).toHaveLength(11);
  });

  it('drops bridges when a neighbor splats or falls', () => {
    const state = stateWith('y......\ny......\nrrr....', { col: 3, row: 13, other: 2 });
    const model = new BoardModel(state);
    const yellow = () => model.drawBridges().filter((b) => b.color === 2 && b.direction === 'v');
    const red = () => model.drawBridges().filter((b) => b.color === 1);
    model.tick(state, step(state, INPUT.SOFT_DROP));
    while (state.phase === 'settling') model.tick(state, step(state));
    expect(red()).toEqual([]);
    expect(yellow()).toHaveLength(1);
    while (state.phase === 'splatting') model.tick(state, step(state));
    expect(yellow()).toEqual([]);
  });

  it('hides ghosts that land in hidden rows, and shows the queue', () => {
    const full = new Array(12).fill('....g..').join('\n');
    const state = stateWith(full, { col: 3, row: 1, orientation: 1 });
    const model = new BoardModel(state);
    expect(model.drawGhost()).toEqual([{ col: 3, row: 13, color: 1 }]);
    expect(model.drawNext()).toEqual(state.queue);
  });
});
