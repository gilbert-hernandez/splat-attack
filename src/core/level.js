import { RULES } from '../config/rules.js';

// The speed ramp. It counts pairs, not time, so slow chains aren't punished.

/**
 * The level of the nth pair, from 1.
 * @param {number} pairs pairs spawned so far, including the falling one
 */
export function levelAt(pairs) {
  return 1 + Math.floor(Math.max(0, pairs - 1) / RULES.pairsPerLevel);
}

/** @param {number} level */
export function fallSpeedAt(level) {
  return Math.min(RULES.maxFallSpeed, RULES.fallSpeed + RULES.fallSpeedPerLevel * (level - 1));
}
