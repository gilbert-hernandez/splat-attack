import { expect, it } from 'vitest';
import { INPUT, step } from '../../src/core/engine.js';
import { playReplay } from '../../src/core/replay.js';
import MatchRunner from '../../src/match/runner.js';
import MatchStats, { formatTime } from '../../src/match/stats.js';
import { stateWith } from '../core/fixtures.js';

it('sums up a match with a long chain, keeping the longest', () => {
  const state = stateWith('.ygbpr.\n.rygbpr\n.rygbpr\n.rygbpr', { col: 0, row: 13 });
  const stats = new MatchStats();
  let input = INPUT.SOFT_DROP;
  do {
    stats.add(step(state, input));
    input = 0;
  } while (state.phase !== 'falling');
  stats.add([{ type: 'splat', chain: 1, groups: [], points: 0 }]);
  // 40 + 100 + 180 + 280 + 400 + 540 power is 22 gunk.
  expect(stats.summary(state)).toEqual({
    score: 3080,
    level: 1,
    pairs: 2,
    longestChain: 6,
    ticks: state.tick,
    gunkSent: 22,
    outcome: null,
  });
});

it('is the same from a replay', () => {
  const live = new MatchStats();
  const runner = new MatchRunner({ seed: 3, readInput: () => 16, onTick: (_state, events) => live.add(events) });
  while (runner.state.phase !== 'over') runner.advance(1);
  const played = new MatchStats();
  const state = playReplay(runner.replay, (_state, events) => played.add(events));
  expect(played.summary(state)).toEqual(live.summary(runner.state));
});

it.each([
  [0, '0:00'],
  [59, '0:00'],
  [60 * 65, '1:05'],
  [60 * 600, '10:00'],
])('formats %i ticks as %s', (ticks, text) => {
  expect(formatTime(ticks)).toBe(text);
});

it('counts cancelled gunk as sent and keeps a Ladder outcome', () => {
  const stats = new MatchStats();
  stats.add([{ type: 'attack', gunk: 5, cancelled: 3, sent: 2, pending: 0 }]);
  stats.add([{ type: 'attack', gunk: 1, cancelled: 0, sent: 1, pending: 0 }]);
  const state = stateWith('.......');
  expect(stats.summary(state, 'win')).toMatchObject({ gunkSent: 6, outcome: 'win' });
});
