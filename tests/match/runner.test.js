import { describe, expect, it } from 'vitest';
import { CLOCK } from '../../src/config/input.js';
import { hashState, playReplay } from '../../src/core/replay.js';
import { nextInt, seedRng } from '../../src/core/rng.js';
import MatchRunner from '../../src/match/runner.js';

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
