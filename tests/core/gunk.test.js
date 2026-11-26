import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { CRACKED, GUNK, ROWS, createGrid, setCell } from '../../src/core/grid.js';
import { RIGHT } from '../../src/core/pair.js';
import { dropGunk, gunkSeed, hitGunk } from '../../src/core/gunk.js';
import { board, parseBoard, renderBoard, renderStains, stateWith } from './fixtures.js';

const SOFT = INPUT.SOFT_DROP;
const [RED, GREEN] = [1, 3];
const B = ROWS - 1;

/** Locks the given pair at once, then steps until the next pair. */
function play(text, pair, stains) {
  const state = stateWith(text, pair, stains);
  const events = step(state, SOFT);
  for (let ticks = 0; state.phase !== 'falling' && state.phase !== 'over'; ticks++) {
    if (ticks > 10000) throw new Error('never settled');
    events.push(...step(state));
  }
  return { state, events, hits: events.filter((e) => e.type === 'gunkHit') };
}

const bottomLeft = { col: 0, row: B };

describe('hitGunk', () => {
  it('cracks whole gunk and clears cracked gunk next to a group', () => {
    const grid = parseBoard('#......\n.+.....');
    const result = hitGunk(grid, [{ color: RED, cells: [{ col: 0, row: B }] }]);
    expect(result).toEqual({ cracked: [{ col: 0, row: B - 1 }], cleared: [{ col: 1, row: B }] });
    expect(renderBoard(grid)).toBe(board('+......\n.......'));
  });

  it('hits each gunk once, however many splatted cells touch it', () => {
    const grid = parseBoard('r#r....\n.r.....');
    const cells = [
      { col: 0, row: B - 1 },
      { col: 2, row: B - 1 },
      { col: 1, row: B },
    ];
    expect(hitGunk(grid, [{ color: RED, cells }]).cracked).toHaveLength(1);
    expect(renderBoard(grid)).toBe(board('r+r....\n.r.....'));
  });

  it('never hits gunk in the hidden rows or diagonal gunk', () => {
    const grid = createGrid();
    setCell(grid, 0, 1, GUNK);
    setCell(grid, 1, 3, CRACKED);
    expect(hitGunk(grid, [{ color: RED, cells: [{ col: 0, row: 2 }] }])).toEqual({ cracked: [], cleared: [] });
  });
});

describe('gunk in a match', () => {
  it('cracks next to a splat and stays in place', () => {
    const { state, hits } = play('.rrr#..', bottomLeft);
    expect(hits).toEqual([{ type: 'gunkHit', cracked: [{ col: 4, row: B }], cleared: [] }]);
    expect(renderBoard(state.grid)).toBe(board('b...+..'));
  });

  it('clears cracked gunk, lets blobs above fall, and leaves its stain alone', () => {
    const { state, hits } = play('....g..\n.rrr+..', bottomLeft, '....b..');
    expect(hits).toEqual([{ type: 'gunkHit', cracked: [], cleared: [{ col: 4, row: B }] }]);
    expect(renderBoard(state.grid)).toBe(board('b...g..'));
    expect(renderStains(state.stains)).toBe(board('rrrrb..'));
  });

  it('takes one hit from two groups in the same step', () => {
    const pair = { col: 2, row: B - 1, orientation: RIGHT, pivot: RED, other: GREEN };
    const { state, events, hits } = play('....ggg\nrrr#yby', pair);
    expect(events.find((e) => e.type === 'splat').groups).toHaveLength(2);
    expect(hits).toEqual([{ type: 'gunkHit', cracked: [{ col: 3, row: B }], cleared: [] }]);
    expect(renderBoard(state.grid)).toBe(board('...+yby'));
  });

  it('cracks in chain step 1 and clears in step 2', () => {
    const { state, events } = play('r......\nr#.....\nrbbb...', { col: 0, row: B - 3 });
    const steps = events.filter((e) => e.type === 'splat' || e.type === 'gunkHit').map((e) => e.type);
    expect(steps).toEqual(['splat', 'gunkHit', 'splat', 'gunkHit']);
    const [crack, clear] = events.filter((e) => e.type === 'gunkHit');
    expect(crack.cracked).toEqual([{ col: 1, row: B - 1 }]);
    expect(clear.cleared).toEqual([{ col: 1, row: B - 1 }]);
    expect(renderBoard(state.grid)).toBe(board('.......'));
  });

  it('sends no hit event when no gunk is touched', () => {
    expect(play('.rrr...', bottomLeft).hits).toEqual([]);
  });
});

describe('gunk drops', () => {
  /** Steps a state with pending gunk until its next pair spawns. */
  const toNextPair = (state) => {
    const events = [];
    for (let ticks = 0; state.phase !== 'falling' && state.phase !== 'over'; ticks++) {
      if (ticks > 10000) throw new Error('never settled');
      events.push(...step(state));
    }
    return events;
  };
  const dropsOf = (events) => events.filter((e) => e.type === 'drop');

  it('waits for the falling pair to lock and its chain to end', () => {
    const state = createState(5);
    state.pending = 3;
    for (let i = 0; i < 20; i++) expect(dropsOf(step(state))).toEqual([]);
    expect(state.phase).toBe('falling');
    const events = [];
    while (state.phase === 'falling') events.push(...step(state, SOFT));
    // Locks, then drops before the next pair.
    events.push(...toNextPair(state));
    const types = events.map((e) => e.type);
    expect(types.indexOf('lock')).toBeLessThan(types.indexOf('drop'));
    expect(state.pending).toBe(0);
    expect(state.dropped).toBe(false);
  });

  it('drops after the chain end and its attack', () => {
    const state = stateWith('.rrr...', bottomLeft);
    state.pending = 2;
    const events = [...step(state, SOFT), ...toNextPair(state)];
    expect(events.map((e) => e.type).filter((t) => ['chainEnd', 'drop'].includes(t))).toEqual(['chainEnd', 'drop']);
  });

  it('lands full rows first, then single gunk in different columns', () => {
    const state = stateWith('.......', bottomLeft);
    state.grid = createGrid();
    state.pair = null;
    state.phase = 'settling';
    state.wait = 1;
    state.pending = 10;
    const [drop] = dropsOf(toNextPair(state));
    expect(drop.cells).toHaveLength(10);
    const perColumn = new Array(7).fill(0);
    for (const { col } of drop.cells) perColumn[col]++;
    expect(perColumn.filter((n) => n === 2)).toHaveLength(3);
    expect(perColumn.filter((n) => n === 1)).toHaveLength(4);
    const bottom = renderBoard(state.grid).split('\n').at(-1);
    expect(bottom).toBe('#######');
  });

  it('stacks gunk on top of each column', () => {
    const state = { grid: parseBoard('r......\ny...b..'), pending: 7, gunkRng: 1 };
    dropGunk(state);
    expect(renderBoard(state.grid)).toBe(
      board(`
      #......
      r...#..
      y###b##`),
    );
  });

  it('drops at most the cap and keeps the rest pending', () => {
    const state = { grid: createGrid(), pending: RULES.attack.maxDrop + 5, gunkRng: 1 };
    expect(dropGunk(state)).toHaveLength(RULES.attack.maxDrop);
    expect(state.pending).toBe(5);
  });

  it('loses gunk that does not fit', () => {
    const grid = parseBoard(new Array(ROWS - 1).fill('rygbpry').join('\n'));
    const state = { grid, pending: 14, gunkRng: 1 };
    expect(dropGunk(state)).toHaveLength(7);
    expect(state.pending).toBe(0);
  });

  it('picks the same columns for the same seed and side, and different ones per side', () => {
    const columns = (seed, side) => {
      const state = { grid: createGrid(), pending: 3, gunkRng: gunkSeed(seed, side) };
      return dropGunk(state).map((c) => c.col);
    };
    expect(columns(42, 0)).toEqual(columns(42, 0));
    const differs = [1, 2, 3, 4, 5, 6, 7, 8].some((seed) => columns(seed, 0).join() !== columns(seed, 1).join());
    expect(differs).toBe(true);
    expect(createState(42, 1).gunkRng).toBe(gunkSeed(42, 1));
  });

  it('tops out the board when a drop fills the spawn cell', () => {
    const rows = Array.from({ length: ROWS - 4 }, (_, i) => (i % 2 ? 'rygbpry' : 'bpryrgb')).join('\n');
    const state = stateWith(rows, bottomLeft);
    state.pair = null;
    state.phase = 'settling';
    state.wait = 1;
    state.pending = 21;
    const events = toNextPair(state);
    expect(events.map((e) => e.type)).toEqual(['drop', 'over']);
    expect(state.phase).toBe('over');
  });
});
