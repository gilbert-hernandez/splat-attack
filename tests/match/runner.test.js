import { describe, expect, it } from 'vitest';
import { CLOCK } from '../../src/config/input.js';
import { hashState, playReplay } from '../../src/core/replay.js';
import { nextInt, seedRng } from '../../src/core/rng.js';
import MatchRunner from '../../src/match/runner.js';
import MatchInput from '../../src/match/input.js';
import { RULES } from '../../src/config/rules.js';
import { createRival, rivalInput } from '../../src/ai/rival.js';
import { createSparring, sparringInput } from '../../src/ai/sparring.js';

const idle = () => 0;

describe('match runner', () => {
  it.each([30, 60, 144])('runs 60 ticks in a second at %i fps', (fps) => {
    const runner = new MatchRunner({ seed: 1, readInput: idle });
    for (let i = 0; i < fps; i++) runner.update(1000 / fps);
    expect(runner.state.tick).toBe(60);
  });

  it('drops the time of a long stall', () => {
    const runner = new MatchRunner({ seed: 1, readInput: idle });
    runner.update(5000);
    expect(runner.state.tick).toBe(CLOCK.maxTicksPerFrame);
    runner.update(1);
    expect(runner.state.tick).toBe(CLOCK.maxTicksPerFrame);
  });

  it('only ticks on request in manual mode', () => {
    const runner = new MatchRunner({ seed: 1, readInput: idle });
    runner.manual = true;
    runner.update(1000);
    expect(runner.state.tick).toBe(0);
    runner.advance(10);
    expect(runner.state.tick).toBe(10);
  });

  it('records a match that replays to the same state, and keeps calling onTick after it ends', () => {
    let rng = seedRng(9);
    let calls = 0;
    const readInput = () => {
      const draw = nextInt(rng, 32);
      rng = draw.rng;
      return draw.value;
    };
    const runner = new MatchRunner({ seed: 42, readInput, onTick: () => calls++ });
    for (let i = 0; i < 200 && runner.state.phase !== 'over'; i++) runner.advance(100);
    expect(runner.state.phase).toBe('over');
    expect(calls).toBeGreaterThanOrEqual(runner.state.tick);
    const before = calls;
    runner.advance(5);
    expect(calls).toBe(before + 5);
    const copy = JSON.parse(JSON.stringify(runner.replay));
    expect(hashState(playReplay(copy))).toBe(hashState(runner.state));
  });

  it('freezes, steps, and continues without catching up', () => {
    const runner = new MatchRunner({ seed: 1, readInput: idle });
    runner.update(40);
    const { tick } = runner.state;
    runner.setFrozen(true);
    runner.update(1000);
    expect(runner.state.tick).toBe(tick);
    runner.advance(1);
    expect(runner.state.tick).toBe(tick + 1);
    runner.setFrozen(false);
    runner.update(1);
    expect(runner.state.tick).toBe(tick + 1);
  });

  it('keeps a true replay when frozen, stepped and fast-forwarded', () => {
    const runner = new MatchRunner({ seed: 7, readInput: () => 16 });
    runner.rate = 8;
    for (let i = 0; i < 5; i++) runner.update(1000 / 60);
    expect(runner.state.tick).toBe(40);
    runner.setFrozen(true);
    runner.advance(3);
    runner.setFrozen(false);
    runner.update(1000 / 60);
    expect(runner.state.tick).toBe(51);
    expect(hashState(playReplay(runner.replay))).toBe(hashState(runner.state));
    runner.update(5000);
    expect(runner.state.tick).toBe(51 + 8 * CLOCK.maxTicksPerFrame);
  });

  it('keeps ticking without a replay', () => {
    const runner = new MatchRunner({ seed: 1, readInput: idle });
    runner.dropReplay();
    runner.advance(5);
    expect([runner.replay, runner.state.tick]).toEqual([null, 5]);
  });
});

describe('versus runner', () => {
  const ladder = (options = {}) => {
    const bot = createSparring();
    return new MatchRunner({
      seed: 5,
      readInput: idle,
      readRivalInput: (board) => sparringInput(bot, board),
      ...options,
    });
  };

  it("runs both boards and passes both sides' events", () => {
    const seen = { player: 0, rival: 0 };
    const runner = ladder({
      onTick: (state, events, rivalEvents) => {
        seen.player += events.length;
        seen.rival += rivalEvents.length;
        expect(state).toBe(runner.state);
      },
    });
    for (let i = 0; i < 300; i++) runner.update(1000 / 60);
    expect(runner.match.tick).toBe(300);
    expect(runner.state).toBe(runner.match.boards[0]);
    expect(runner.rival).toBe(runner.match.boards[1]);
    expect(runner.rival.pairs).toBeGreaterThan(1);
    expect(seen.rival).toBeGreaterThan(0);
  });

  it("gives the rival's input source both boards, as they are before the tick", () => {
    const runner = ladder({
      readRivalInput: (board, opponent) => {
        expect(board).toBe(runner.rival);
        expect(opponent).toBe(runner.state);
        expect([board.tick, opponent.tick]).toEqual([runner.match.tick, runner.match.tick]);
        return 0;
      },
    });
    runner.advance(20);
    expect(runner.match.tick).toBe(20);
  });

  it('a CPU rival plays a versus match that replays to the same hash', { timeout: 60000 }, () => {
    const bot = createRival('rival3', 5);
    const runner = ladder({
      readInput: () => 16,
      readRivalInput: (board, opponent) => rivalInput(bot, board, opponent),
    });
    runner.rate = 8;
    for (let i = 0; i < 4000 && !runner.over; i++) runner.update(1000 / 60);
    expect(runner.outcome).toBe('loss');
    expect(hashState(playReplay(JSON.parse(JSON.stringify(runner.replay))))).toBe(hashState(runner.match));
  });

  it('records a versus replay that plays back to the same match', () => {
    const runner = ladder({ readInput: () => 16 });
    runner.rate = 8;
    for (let i = 0; i < 2000 && !runner.over; i++) runner.update(1000 / 60);
    expect(runner.over).toBe(true);
    expect(runner.outcome).toBe('loss');
    expect(runner.replay.format).toBe(3);
    const played = playReplay(JSON.parse(JSON.stringify(runner.replay)));
    expect(hashState(played)).toBe(hashState(runner.match));
  });

  it('keeps calling onTick after the outcome, with no events', () => {
    let last = null;
    const runner = ladder({ readInput: () => 16, onTick: (...args) => (last = args) });
    while (!runner.over) runner.advance(1);
    runner.advance(3);
    expect(last.slice(1)).toEqual([[], []]);
  });

  it('can drop its replay and keep ticking', () => {
    const runner = ladder();
    runner.dropReplay();
    runner.advance(5);
    expect([runner.replay, runner.match.tick]).toEqual([null, 5]);
  });

  it('is solo without a rival', () => {
    const runner = new MatchRunner({ seed: 1, readInput: idle });
    expect([runner.match, runner.rival, runner.outcome, runner.replay.format]).toEqual([null, null, null, 1]);
  });
});

describe('meter choice in a running match', () => {
  /** A Ladder-like runner whose player input comes from MatchInput, choice included. */
  function choosingRunner() {
    let runner = null;
    const keys = new MatchInput({ canOpen: () => runner.state.meter === RULES.meter.max });
    const rival = createSparring();
    runner = new MatchRunner({
      seed: 3,
      readInput: () => keys.next(),
      readRivalInput: (board) => sparringInput(rival, board),
    });
    return { runner, keys };
  }

  it('keeps time running while the choice is open, and the pair falls and locks', () => {
    const { runner, keys } = choosingRunner();
    runner.state.meter = RULES.meter.max;
    keys.press('Space');
    expect(keys.choice.open).toBe(true);
    const pairs = runner.state.pairs;
    const row = runner.state.pair.row;
    for (let i = 0; i < 60; i++) runner.update(1000 / 60);
    expect(runner.state.tick).toBe(60);
    expect(runner.state.pair.row).toBeGreaterThan(row);
    // Held open past its time: it closed, and play went on to lock the pair.
    keys.openChoice();
    for (let i = 0; i < 600; i++) runner.update(1000 / 60);
    expect(runner.state.pairs).toBeGreaterThan(pairs);
  });

  it('replays a Bomb fired by choice to the same state', { timeout: 30000 }, () => {
    // The player is a sparring bot that never fires the meter itself; once its meter is full, the
    // choice opens with Space and D picks Bomb, as a person would.
    let runner = null;
    const keys = new MatchInput({ canOpen: () => runner.state.meter === RULES.meter.max });
    const player = createSparring({ actEvery: 2, dropDelay: 4, rinseAt: Infinity, bombRows: 0 });
    const rival = createSparring();
    let bombs = 0;
    runner = new MatchRunner({
      seed: 8,
      readInput: () => {
        if (runner.state.meter === RULES.meter.max && runner.state.phase === 'falling' && !keys.choice.open) {
          keys.press('Space');
          keys.release('Space');
          keys.press('KeyD');
          keys.release('KeyD');
        }
        return keys.next() | sparringInput(player, runner.state);
      },
      readRivalInput: (board) => sparringInput(rival, board),
      onTick: (_state, events) => (bombs += events.filter((e) => e.type === 'bomb').length),
    });
    while (bombs === 0 && !runner.over) runner.advance(1);
    expect(bombs).toBe(1);
    runner.advance(120);
    const played = playReplay(JSON.parse(JSON.stringify(runner.replay)));
    expect(hashState(played)).toBe(hashState(runner.match));
  });
});
