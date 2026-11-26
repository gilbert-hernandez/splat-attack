import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { firstDifference, replayResult } from '../../scripts/replayResult.js';
import { RULES } from '../../src/config/rules.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { createReplay, hashState, packInputs, playReplay, recordInput } from '../../src/core/replay.js';
import { createVersus, stepVersus } from '../../src/core/versus.js';
import { nextInt } from '../../src/core/rng.js';
import { createSparring, sparringInput } from '../../src/ai/sparring.js';

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
    [{ format: 4, seed: 1, inputs: [] }, 'format: 4'],
    [{ format: 3, seed: 1, inputs: [[16384, 1]] }, 'invalid mask: 16384'],
    [{ format: 1, seed: -1, inputs: [] }, 'got -1'],
    [{ format: 1, seed: 1 }, 'must be a list'],
    [{ format: 1, seed: 1, inputs: [[0, 1], [128, 1]] }, 'input 1 has an invalid mask: 128'], // prettier-ignore
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

describe('versus replays', () => {
  /** Records a versus match of random inputs on both sides to the end. */
  function recordVersus(seed) {
    const replay = createReplay(seed, true);
    const match = createVersus(seed);
    let rng = seed + 91;
    while (match.outcome === null) {
      // All seven bits a side, so both fire the meter.
      const a = nextInt(rng, 128);
      const b = nextInt(a.rng, 128);
      rng = b.rng;
      recordInput(replay, match, packInputs(a.value, b.value));
      stepVersus(match, a.value, b.value);
    }
    return { replay, match };
  }

  it('gives the same match back after a JSON round trip', () => {
    for (let seed = 0; seed < 5; seed++) {
      const { replay, match } = recordVersus(seed);
      expect(replay.format).toBe(3);
      const played = playReplay(JSON.parse(JSON.stringify(replay)));
      expect(played).toEqual(match);
      expect(played.outcome).toBe(match.outcome);
      expect(hashState(played)).toBe(hashState(match));
    }
  });

  it('gives back both meters when both sides fire Rinse and Bomb', () => {
    const fired = new Set();
    for (let seed = 1; seed <= 8 && fired.size < 4; seed++) {
      const replay = createReplay(seed, true);
      const match = createVersus(seed);
      // Eager meter use: one side Bombs any stack, the other only Rinses, swapping each seed.
      const bomber = { rinseAt: 1, bombRows: RULES.visibleRows };
      const rinser = { rinseAt: 1, bombRows: 0 };
      const [first, second] = seed % 2 ? [bomber, rinser] : [rinser, bomber];
      const bots = [createSparring({ actEvery: 2, dropDelay: 4, ...first }), createSparring(second)];
      while (match.outcome === null) {
        const inputs = bots.map((bot, side) => sparringInput(bot, match.boards[side]));
        recordInput(replay, match, packInputs(...inputs));
        stepVersus(match, ...inputs).forEach((list, side) => {
          for (const e of list) if (e.type === 'rinse' || e.type === 'bomb') fired.add(`${e.type} ${side}`);
        });
      }
      const played = playReplay(JSON.parse(JSON.stringify(replay)));
      expect(played.boards.map((b) => b.meter)).toEqual(match.boards.map((b) => b.meter));
      expect(hashState(played)).toBe(hashState(match));
    }
    expect([...fired].sort()).toEqual(['bomb 0', 'bomb 1', 'rinse 0', 'rinse 1']);
  });

  it('packs the player low and the rival high', () => {
    expect(packInputs(16, 0)).toBe(16);
    expect(packInputs(0, 16)).toBe(16 << 7);
    expect(packInputs(127, 127)).toBe(16383);
    expect(packInputs(INPUT.BOMB, INPUT.RINSE)).toBe(64 | (32 << 7));
  });

  it("passes both sides' events to onTick", () => {
    const { replay } = recordVersus(1);
    let ticks = 0;
    playReplay(replay, (match, events) => {
      ticks++;
      expect(events).toHaveLength(2);
      expect(match.boards).toHaveLength(2);
    });
    expect(ticks).toBeGreaterThan(0);
  });

  it('ignores ticks after the outcome', () => {
    const { replay, match } = recordVersus(2);
    const before = JSON.stringify(replay);
    recordInput(replay, match, 1);
    expect(JSON.stringify(replay)).toBe(before);
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

  it('changes with any stain', () => {
    const state = createState(4);
    const hashes = new Set([hashState(state)]);
    state.stains.forEach((_, i) => {
      const other = structuredClone(state);
      other.stains[i] = 2;
      hashes.add(hashState(other));
    });
    expect(hashes.size).toBe(1 + state.stains.length);
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

  it('cover a versus win with gunk cracked and cleared', () => {
    const versus = stored.filter(({ replay }) => replay.format === 3).map((s) => s.expected);
    const won = versus.some((r) => r.outcome === 'win' && r.cracks > 0 && r.clears > 0);
    expect(won, 'run: npm run replays -- --generate').toBe(true);
  });

  it('cover Rinse and Bomb', () => {
    const results = stored.map((s) => s.expected);
    const hint = 'run: npm run replays -- --generate';
    expect(results.some((r) => r.rinses > 0), hint).toBe(true); // prettier-ignore
    expect(results.some((r) => r.bombs > 0), hint).toBe(true); // prettier-ignore
  });

  it('cover a stain match', () => {
    const matches = stored.map(({ replay }) => {
      let count = 0;
      playReplay(replay, (_state, events) => {
        for (const e of events.flat()) if (e.type === 'splat') for (const g of e.groups) count += g.matched.length;
      });
      return count;
    });
    expect(
      matches.some((m) => m > 0),
      'run: npm run replays -- --generate',
    ).toBe(true);
  });
});
