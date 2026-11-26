import { describe, expect, it } from 'vitest';
import { INPUT, step } from '../../src/core/engine.js';
import { ROWS } from '../../src/core/grid.js';
import { hashState } from '../../src/core/replay.js';
import { nextInt } from '../../src/core/rng.js';
import { createVersus, forceTopOut, stepVersus } from '../../src/core/versus.js';
import { parseBoard } from './fixtures.js';

const SOFT = INPUT.SOFT_DROP;
const B = ROWS - 1;

/** Plays random inputs on both sides from one input seed. */
function randomMatch(seed, inputSeed, maxTicks = 20000) {
  const match = createVersus(seed);
  let rng = inputSeed;
  while (match.outcome === null && match.tick < maxTicks) {
    const a = nextInt(rng, 32);
    const b = nextInt(a.rng, 32);
    rng = b.rng;
    stepVersus(match, a.value, b.value);
  }
  return match;
}

/** Sets a board up to send `sent` gunk at its next chain end: a 4-chain sends 8. */
function primeChain(board) {
  board.grid = parseBoard(`
    .ygb...
    .rygb..
    .rygb..
    .rygb..`);
  Object.assign(board.pair, { col: 0, row: B, orientation: 0, pivot: 1, other: 4 });
}

describe('versus', () => {
  it('gives both boards the same pairs', () => {
    const match = createVersus(77);
    const [player, rival] = match.boards;
    expect(rival.pair).toEqual(player.pair);
    expect(rival.queue).toEqual(player.queue);
    // Played apart with different inputs, so they reach each pair at different ticks.
    const spawned = match.boards.map((board, side) => {
      const pairs = [];
      let rng = side + 1;
      while (board.phase !== 'over' && board.tick < 50000) {
        const draw = nextInt(rng, 32);
        rng = draw.rng;
        step(board, draw.value);
        if (board.pair && pairs.length < board.pairs) pairs.push([board.pair.pivot, board.pair.other]);
      }
      return pairs;
    });
    const shared = Math.min(spawned[0].length, spawned[1].length);
    expect(shared).toBeGreaterThan(10);
    expect(spawned[0].slice(0, shared)).toEqual(spawned[1].slice(0, shared));
  });

  it('gives each side its own gunk stream', () => {
    const [player, rival] = createVersus(77).boards;
    expect(player.gunkRng).not.toBe(rival.gunkRng);
  });

  it('is the same for the same seed and inputs', () => {
    const a = randomMatch(5, 9);
    const b = randomMatch(5, 9);
    expect(a.outcome).not.toBeNull();
    expect(hashState(a)).toBe(hashState(b));
    expect(a).toEqual(b);
  });

  it('delivers sent gunk to the other board after both steps', () => {
    const match = createVersus(3);
    primeChain(match.boards[0]);
    const sent = [];
    for (let i = 0; i < 1000 && sent.length === 0; i++) {
      const [events] = stepVersus(match, i === 0 ? SOFT : 0);
      sent.push(...events.filter((e) => e.type === 'attack'));
    }
    expect(sent).toEqual([{ type: 'attack', gunk: 8, cancelled: 0, sent: 8, pending: 0 }]);
    expect(match.boards[1].pending).toBe(8);
    expect(match.boards[0].pending).toBe(0);
  });

  it('lets same-tick attacks offset only gunk pending before that tick', () => {
    const match = createVersus(3);
    primeChain(match.boards[0]);
    primeChain(match.boards[1]);
    match.boards[0].pending = 3;
    let attacks = [];
    for (let i = 0; i < 1000 && attacks.length === 0; i++) {
      const events = stepVersus(match, i === 0 ? SOFT : 0, i === 0 ? SOFT : 0);
      attacks = events.map((list) => list.find((e) => e.type === 'attack')).filter(Boolean);
    }
    // Both chains end on the same tick: the player cancels its 3 and sends 5, the rival sends 8.
    expect(attacks.map((a) => a.sent)).toEqual([5, 8]);
    expect(match.boards[0].pending).toBe(8);
    expect(match.boards[1].pending).toBe(5);
  });

  it('is a win when the rival tops out and a loss when the player does', () => {
    const win = createVersus(1);
    win.boards[1].phase = 'over';
    stepVersus(win);
    expect(win.outcome).toBe('win');
    const loss = createVersus(1);
    forceTopOut(loss, 0);
    expect(loss.outcome).toBe('loss');
  });

  it('is a draw when both top out on the same tick', () => {
    const match = createVersus(1);
    for (const board of match.boards) {
      board.grid = parseBoard(`
        ...r...
        ..rbp..
        ..pgy..
        .ybpgr.
        .grybp.
        ypbgryg
        rgypbrb
        byrgpyp
        pgbyrgr
        ybprgby
        grypbpg`);
      Object.assign(board.pair, { pivot: 2, other: 3 });
    }
    while (match.outcome === null) stepVersus(match, SOFT, SOFT);
    expect(match.outcome).toBe('draw');
  });

  it('changes nothing once there is an outcome', () => {
    const match = randomMatch(8, 2);
    const before = structuredClone(match);
    for (let i = 0; i < 100; i++) expect(stepVersus(match, SOFT, SOFT)).toEqual([[], []]);
    expect(match).toEqual(before);
  });

  it('runs each board by the single-board rules', () => {
    const match = createVersus(11);
    const solo = structuredClone(match.boards[0]);
    for (let i = 0; i < 500; i++) {
      stepVersus(match, i % 5 === 0 ? SOFT : 0, 0);
      step(solo, i % 5 === 0 ? SOFT : 0);
    }
    expect(match.boards[0]).toEqual(solo);
  });
});
