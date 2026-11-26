// What stored replays are checked against. Pure, so tests use it in Node and in the browser.
import { hashState, playReplay } from '../src/core/replay.js';

const CHECKPOINT_TICKS = 600;

/**
 * Plays a replay: its final numbers (the player's, in versus), and a state hash every
 * CHECKPOINT_TICKS, and the Rinses and Bombs fired on every board. Versus results add the outcome and
 * the gunk cracked and cleared on both boards.
 */
export function replayResult(replay) {
  const checkpoints = [];
  let longestChain = 0;
  const gunk = { cracks: 0, clears: 0 };
  const meter = { rinses: 0, bombs: 0 };
  const match = playReplay(replay, (current, events) => {
    const versus = 'boards' in current;
    const player = versus ? events[0] : events;
    for (const event of player) if (event.type === 'splat') longestChain = Math.max(longestChain, event.chain);
    for (const event of versus ? events.flat() : events) {
      if (event.type === 'rinse') meter.rinses++;
      if (event.type === 'bomb') meter.bombs++;
    }
    for (const event of versus ? events.flat() : []) {
      if (event.type !== 'gunkHit') continue;
      gunk.cracks += event.cracked.length;
      gunk.clears += event.cleared.length;
    }
    if (current.tick % CHECKPOINT_TICKS === 0) checkpoints.push(hashState(current));
  });
  const versus = 'boards' in match;
  const { phase, chain, score } = versus ? match.boards[0] : match;
  const result = {
    ticks: match.tick,
    phase,
    chain,
    score,
    longestChain,
    ...meter,
    hash: hashState(match),
    checkpoints,
  };
  return versus ? { ...result, outcome: match.outcome, ...gunk } : result;
}

/** The first difference between an expected and an actual result, or null. */
export function firstDifference(expected, actual) {
  const length = Math.max(expected.checkpoints.length, actual.checkpoints.length);
  for (let i = 0; i < length; i++) {
    if (expected.checkpoints[i] !== actual.checkpoints[i]) {
      return `differs by tick ${(i + 1) * CHECKPOINT_TICKS}`;
    }
  }
  for (const key of [
    'ticks',
    'phase',
    'chain',
    'score',
    'longestChain',
    'rinses',
    'bombs',
    'outcome',
    'cracks',
    'clears',
    'hash',
  ]) {
    if (expected[key] !== actual[key]) return `${key} is ${actual[key]}, expected ${expected[key]}`;
  }
  return null;
}
