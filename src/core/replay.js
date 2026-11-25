import { createState, step } from './engine.js';

// Replays: a match's seed and inputs. Inputs are run-length encoded as [mask, ticks].

const FORMAT = 1;
const MAX_MASK = 31;

/**
 * @typedef {object} Replay
 * @property {number} format
 * @property {number} seed
 * @property {number[][]} inputs
 */

/**
 * An empty recording of a match with this seed.
 * @param {number} seed
 * @returns {Replay}
 */
export function createReplay(seed) {
  return { format: FORMAT, seed, inputs: [] };
}

/**
 * Records one tick's input. Call it before `step` with the same state and input.
 * @param {Replay} replay
 * @param {import('./engine.js').State} state
 * @param {number} [input]
 */
export function recordInput(replay, state, input = 0) {
  if (state.phase === 'over') return;
  const mask = input & MAX_MASK;
  const last = replay.inputs[replay.inputs.length - 1];
  if (last && last[0] === mask) last[1]++;
  else replay.inputs.push([mask, 1]);
}

/**
 * Plays a replay and returns the final state.
 * @param {Replay} replay
 * @param {(state: import('./engine.js').State, events: import('./engine.js').Event[]) => void} [onTick]
 */
export function playReplay(replay, onTick = () => {}) {
  validate(replay);
  const state = createState(replay.seed);
  for (const [mask, ticks] of replay.inputs) {
    for (let i = 0; i < ticks && state.phase !== 'over'; i++) {
      const events = step(state, mask);
      onTick(state, events);
    }
  }
  return state;
}

/** Throws if a replay can't be played. (createState checks the seed.) */
function validate(replay) {
  if (replay?.format !== FORMAT) throw new Error(`Unknown replay format: ${String(replay?.format)}`);
  if (!Array.isArray(replay.inputs)) throw new Error('Replay inputs must be a list');
  replay.inputs.forEach((run, i) => {
    if (!Array.isArray(run) || run.length !== 2) throw new Error(`Replay input ${i} must be [mask, ticks]`);
    const [mask, ticks] = run;
    if (!Number.isInteger(mask) || mask < 0 || mask > MAX_MASK) {
      throw new Error(`Replay input ${i} has an invalid mask: ${String(mask)}`);
    }
    if (!Number.isSafeInteger(ticks) || ticks < 1) {
      throw new Error(`Replay input ${i} has an invalid tick count: ${String(ticks)}`);
    }
  });
}

/** JSON with sorted keys, so property order doesn't matter. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const fields = Object.keys(value).sort();
  return `{${fields.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

/** A state's hash (FNV-1a, 8 hex digits). Finds mistakes; it isn't protection against cheating. */
export function hashState(state) {
  const text = canonical(state);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
