import { createState, step } from './engine.js';
import { createVersus, stepVersus } from './versus.js';

// Replays: a match's seed and inputs. Inputs are run-length encoded as [mask, ticks]. Format 1 is a
// solo match; format 2 is a versus match, whose masks hold the player's input in the low 5 bits and
// the rival's in the next 5.

const SOLO = 1;
const VERSUS = 2;
const INPUT_BITS = 5;
const MAX_MASK = { [SOLO]: (1 << INPUT_BITS) - 1, [VERSUS]: (1 << (2 * INPUT_BITS)) - 1 };

/**
 * @typedef {object} Replay
 * @property {number} format
 * @property {number} seed
 * @property {number[][]} inputs
 */

/** @typedef {import('./engine.js').State | import('./versus.js').Versus} Match */

/**
 * An empty recording of a match with this seed.
 * @param {number} seed
 * @param {boolean} [versus]
 * @returns {Replay}
 */
export function createReplay(seed, versus = false) {
  return { format: versus ? VERSUS : SOLO, seed, inputs: [] };
}

/** Both sides' inputs as one versus mask. */
export function packInputs(player, rival) {
  return (player & MAX_MASK[SOLO]) | ((rival & MAX_MASK[SOLO]) << INPUT_BITS);
}

/** True once a solo or versus match has ended. */
export function isOver(match) {
  return 'boards' in match ? match.outcome !== null : match.phase === 'over';
}

/**
 * Records one tick's input. Call it before stepping with the same match and input. A versus input
 * is packed with `packInputs`.
 * @param {Replay} replay
 * @param {Match} match
 * @param {number} [input]
 */
export function recordInput(replay, match, input = 0) {
  if (isOver(match)) return;
  const mask = input & MAX_MASK[replay.format];
  const last = replay.inputs[replay.inputs.length - 1];
  if (last && last[0] === mask) last[1]++;
  else replay.inputs.push([mask, 1]);
}

/**
 * Plays a replay and returns the final state: a board for format 1, a versus match for format 2.
 * `onTick` gets a board's events, or [player events, rival events] in versus.
 * @param {Replay} replay
 * @param {(match: any, events: any[]) => void} [onTick]
 * @returns {any}
 */
export function playReplay(replay, onTick = () => {}) {
  validate(replay);
  const versus = replay.format === VERSUS;
  const match = versus ? createVersus(replay.seed) : createState(replay.seed);
  for (const [mask, ticks] of replay.inputs) {
    for (let i = 0; i < ticks && !isOver(match); i++) {
      const events = versus
        ? stepVersus(/** @type {any} */ (match), mask & MAX_MASK[SOLO], mask >> INPUT_BITS)
        : step(/** @type {any} */ (match), mask);
      onTick(match, events);
    }
  }
  return match;
}

/** Throws if a replay can't be played. (createState checks the seed.) */
function validate(replay) {
  const format = replay?.format;
  if (format !== SOLO && format !== VERSUS) throw new Error(`Unknown replay format: ${String(format)}`);
  if (!Array.isArray(replay.inputs)) throw new Error('Replay inputs must be a list');
  replay.inputs.forEach((run, i) => {
    if (!Array.isArray(run) || run.length !== 2) throw new Error(`Replay input ${i} must be [mask, ticks]`);
    const [mask, ticks] = run;
    if (!Number.isInteger(mask) || mask < 0 || mask > MAX_MASK[format]) {
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
