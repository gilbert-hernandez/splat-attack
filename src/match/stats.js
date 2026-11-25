import { CLOCK } from '../config/input.js';
import { levelAt } from '../core/level.js';

/**
 * @typedef {object} Stats
 * @property {number} score
 * @property {number} level
 * @property {number} pairs
 * @property {number} longestChain
 * @property {number} ticks
 */

/** Follows a match's events for what the state doesn't keep. */
export default class MatchStats {
  constructor() {
    this.longestChain = 0;
  }

  /** @param {import('../core/engine.js').Event[]} events one tick's events */
  add(events) {
    for (const event of events) {
      if (event.type === 'splat') this.longestChain = Math.max(this.longestChain, event.chain);
    }
  }

  /**
   * @param {import('../core/engine.js').State} state
   * @returns {Stats}
   */
  summary({ score, pairs, tick }) {
    return { score, level: levelAt(pairs), pairs, longestChain: this.longestChain, ticks: tick };
  }
}

/** Ticks as m:ss. */
export function formatTime(ticks) {
  const seconds = Math.floor(ticks / CLOCK.ticksPerSecond);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
