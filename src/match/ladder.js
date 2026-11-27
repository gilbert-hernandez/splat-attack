import { FLOW, RIVALS } from '../config/index.js';

// The Ladder's rival climb until laps arrive (SA-12): a win moves to the next rival, after the last
// back to the first; a loss or draw meets the same rival again.

/**
 * A rival number from scene data, defaulting to the first and kept in range.
 * @param {unknown} value
 */
export function rivalNumber(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= RIVALS.length ? n : 1;
}

/**
 * The rival to meet next.
 * @param {number} rival
 * @param {import('../core/versus.js').Outcome} outcome
 */
export function nextRival(rival, outcome) {
  return outcome === 'win' ? (rival % RIVALS.length) + 1 : rival;
}

/**
 * The rival's label: RIVAL 3 · PAINTER, or #3 PAINTER in its short form.
 * @param {number} rival
 * @param {string} [format] 'long' or 'short'
 */
export function rivalLabel(rival, format = 'long') {
  const { number, style } = RIVALS[rival - 1];
  return FLOW.rivalLabel[format].replace('{number}', String(number)).replace('{style}', style);
}
