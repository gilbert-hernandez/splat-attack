import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { firstDifference, replayResult } from '../../scripts/replayResult.js';
import { createState, step } from '../../src/core/engine.js';
import { createReplay, hashState, playReplay, recordInput } from '../../src/core/replay.js';
import { nextInt } from '../../src/core/rng.js';

/** Records a match of random inputs to the end. */
function recordRandom(seed) {
  const replay = createReplay(seed);
  const state = createState(seed);
  let rng = seed + 77;
  while (state.phase !== 'over') {
    const draw = nextInt(rng, 32);
    rng = draw.rng;
    recordInput(replay, state, draw.value);
    step(state, draw.value);
  }
  return { replay, state };
}

describe('recording and playback', () => {
  it('gives the same match back after a JSON round trip', () => {
    for (let seed = 0; seed < 10; seed++) {
      const { replay, state } = recordRandom(seed);
      const played = playReplay(JSON.parse(JSON.stringify(replay)));
      expect(played).toEqual(state);
      expect(hashState(played)).toBe(hashState(state));
    }
  });

  it('encodes repeated inputs as runs', () => {
    const replay = createReplay(1);
    const state = createState(1);
    for (const input of [0, 0, 16, 16, 16, 1]) {
      recordInput(replay, state, input);
      step(state, input);
    }
    expect(replay.inputs).toEqual([[0, 2], [16, 3], [1, 1]]); // prettier-ignore
    expect(playReplay(replay)).toEqual(state);
  });

  it('ignores ticks after the match is over', () => {
    const { replay, state } = recordRandom(2);
    const before = JSON.stringify(replay);
    recordInput(replay, state, 1);
    expect(JSON.stringify(replay)).toBe(before);
  });

  it('stops at the end of the match, however long the last run is', () => {
    const { replay, state } = recordRandom(2);
    expect(playReplay({ ...replay, inputs: [...replay.inputs, [0, Number.MAX_SAFE_INTEGER]] })).toEqual(state);
  });

  it.each([
    [null, 'format: undefined'],
    [{ format: 2, seed: 1, inputs: [] }, 'format: 2'],
    [{ format: 1, seed: -1, inputs: [] }, 'got -1'],
    [{ format: 1, seed: 1 }, 'must be a list'],
    [{ format: 1, seed: 1, inputs: [[0, 1], [32, 1]] }, 'input 1 has an invalid mask: 32'], // prettier-ignore
    [{ format: 1, seed: 1, inputs: [[-1, 1]] }, 'invalid mask: -1'],
    [{ format: 1, seed: 1, inputs: [[1.5, 1]] }, 'invalid mask: 1.5'],
    [{ format: 1, seed: 1, inputs: [[0, 0]] }, 'invalid tick count: 0'],
    [{ format: 1, seed: 1, inputs: [[0, '3']] }, 'invalid tick count: 3'],
    [{ format: 1, seed: 1, inputs: [[0]] }, 'input 0 must be'],
    [{ format: 1, seed: 1, inputs: [null] }, 'input 0 must be'],
  ])('rejects %j', (replay, message) => {
    expect(() => playReplay(/** @type {any} */ (replay))).toThrow(message);
  });
});

describe('state hash', () => {
  it('ignores property order', () => {
    const state = createState(4);
    const reversed = Object.fromEntries(Object.entries(state).reverse());
    expect(hashState(reversed)).toBe(hashState(state));
  });

  it('changes with any cell or number', () => {
    const state = createState(4);
    const hashes = new Set([hashState(state)]);
    state.grid.forEach((_, i) => {
      const other = structuredClone(state);
      other.grid[i] = 1;
      hashes.add(hashState(other));
    });
    const numbers = Object.keys(state).filter((key) => typeof state[key] === 'number');
    for (const key of numbers) hashes.add(hashState({ ...state, [key]: state[key] + 1 }));
    expect(hashes.size).toBe(1 + state.grid.length + numbers.length);
  });
});

const DIR = new URL('./replays/', import.meta.url);
const stored = readdirSync(DIR).map((file) => ({ file, ...JSON.parse(readFileSync(new URL(file, DIR), 'utf8')) }));

describe('stored replays', () => {
  it.each(stored)('$file gives its expected result', ({ file, replay, expected }) => {
    const difference = firstDifference(expected, replayResult(replay));
    if (difference) {
      throw new Error(`${file} ${difference}. If the rules change is intended, run: npm run replays`);
    }
  });

  it('cover a top-out, a chain of 3 or more and an unfinished chain', () => {
    const results = stored.map((s) => s.expected);
    const hint = 'run: npm run replays -- --generate';
    expect(results.some((r) => r.phase === 'over'), hint).toBe(true); // prettier-ignore
    expect(results.some((r) => r.longestChain >= 3), hint).toBe(true); // prettier-ignore
    expect(results.some((r) => r.phase === 'splatting' && r.chain >= 2), hint).toBe(true); // prettier-ignore
  });
});
