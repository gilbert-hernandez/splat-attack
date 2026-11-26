import { CLOCK } from '../config/input.js';
import { levelAt } from '../core/level.js';

/**
 * @typedef {object} Stats
 * @property {number} score
 * @property {number} level
 * @property {number} pairs
 * @property {number} longestChain
 * @property {number} ticks
 * @property {number} gunkSent all gunk the player's attacks made, cancelled gunk included
 * @property {import('../core/versus.js').Outcome} outcome null when solo
 */

/** Follows a match's events for what the state doesn't keep. */
export default class MatchStats {
  constructor() {
    this.longestChain = 0;
    this.gunkSent = 0;
  }

  /** @param {import('../core/engine.js').Event[]} events one tick's events */
  add(events) {
    for (const event of events) {
      if (event.type === 'splat') this.longestChain = Math.max(this.longestChain, event.chain);
      if (event.type === 'attack') this.gunkSent += event.gunk;
    }
  }

  /**
   * @param {import('../core/engine.js').State} state the player's board
   * @param {import('../core/versus.js').Outcome} [outcome]
   * @returns {Stats}
   */
  summary({ score, pairs, tick }, outcome = null) {
    const { longestChain, gunkSent } = this;
    return { score, level: levelAt(pairs), pairs, longestChain, ticks: tick, gunkSent, outcome };
  }
}

/** Ticks as m:ss. */
export function formatTime(ticks) {
  const seconds = Math.floor(ticks / CLOCK.ticksPerSecond);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
