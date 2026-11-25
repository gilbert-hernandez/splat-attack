// `npm run replays`: replays the stored inputs and rewrites their expected results, after an
// intended rules change. `npm run replays -- --generate` also makes new inputs.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createState, step } from '../src/core/engine.js';
import { createReplay, recordInput } from '../src/core/replay.js';
import { nextInt } from '../src/core/rng.js';
import { greedyInput, planPair } from './greedy.js';
import { replayResult } from './replayResult.js';

const DIR = new URL('../tests/core/replays/', import.meta.url);
const MAX_TICKS = 60000;

/** Records a match until it ends or `stop` says so. `pick` chooses each tick's input. */
function record(seed, pick, stop = (_state) => false) {
  const replay = createReplay(seed);
  const state = createState(seed);
  while (state.phase !== 'over' && state.tick < MAX_TICKS && !stop(state)) {
    const input = pick(state);
    recordInput(replay, state, input);
    step(state, input);
  }
  return replay;
}

function random(seed) {
  let rng = seed + 1000;
  return record(seed, () => {
    const draw = nextInt(rng, 32);
    rng = draw.rng;
    return draw.value;
  });
}

function greedy(seed, stop) {
  let plan = null;
  let queue = null;
  return record(
    seed,
    (state) => {
      if (state.phase !== 'falling') return 0;
      // A new pair came in when the queue moved on.
      const current = JSON.stringify(state.queue);
      if (queue !== current) {
        queue = current;
        plan = planPair(state);
      }
      return greedyInput(state, plan);
    },
    stop,
  );
}

/** The first seed whose replay passes. */
function find(make, accept) {
  for (let seed = 1; seed <= 500; seed++) {
    const replay = make(seed);
    if (accept(replayResult(replay))) return replay;
  }
  throw new Error('No seed gives a suitable replay');
}

const GENERATORS = {
  random: () => find(random, (r) => r.phase === 'over' && r.score > 0),
  greedy: () =>
    find(
      (seed) => greedy(seed, (s) => s.tick >= 6000),
      (r) => r.longestChain >= 3,
    ),
  'mid-chain': () =>
    find(
      (seed) => greedy(seed, (s) => s.tick >= 6000 || (s.phase === 'splatting' && s.chain >= 2)),
      (r) => r.phase === 'splatting' && r.chain >= 2,
    ),
};

const generate = process.argv.includes('--generate');
mkdirSync(DIR, { recursive: true });
for (const [name, make] of Object.entries(GENERATORS)) {
  const file = new URL(`${name}.json`, DIR);
  const replay = generate ? make() : JSON.parse(readFileSync(file, 'utf8')).replay;
  const expected = replayResult(replay);
  writeFileSync(file, `{\n"expected": ${JSON.stringify(expected, null, 2)},\n"replay": ${JSON.stringify(replay)}\n}\n`);
  console.log(`${name}: ${expected.ticks} ticks, score ${expected.score}, longest chain ${expected.longestChain}`);
}
