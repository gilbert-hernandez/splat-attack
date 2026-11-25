// What stored replays are checked against. Pure, so tests use it in Node and in the browser.
import { hashState, playReplay } from '../src/core/replay.js';

const CHECKPOINT_TICKS = 600;

/** Plays a replay: its final numbers, and a state hash every CHECKPOINT_TICKS. */
export function replayResult(replay) {
  const checkpoints = [];
  let longestChain = 0;
  const state = playReplay(replay, (current, events) => {
    for (const event of events) if (event.type === 'splat') longestChain = Math.max(longestChain, event.chain);
    if (current.tick % CHECKPOINT_TICKS === 0) checkpoints.push(hashState(current));
  });
  const { tick, phase, chain, score } = state;
  return { ticks: tick, phase, chain, score, longestChain, hash: hashState(state), checkpoints };
}

/** The first difference between an expected and an actual result, or null. */
export function firstDifference(expected, actual) {
  const length = Math.max(expected.checkpoints.length, actual.checkpoints.length);
  for (let i = 0; i < length; i++) {
    if (expected.checkpoints[i] !== actual.checkpoints[i]) {
      return `differs by tick ${(i + 1) * CHECKPOINT_TICKS}`;
    }
  }
  for (const key of ['ticks', 'phase', 'chain', 'score', 'longestChain', 'hash']) {
    if (expected[key] !== actual[key]) return `${key} is ${actual[key]}, expected ${expected[key]}`;
  }
  return null;
}
