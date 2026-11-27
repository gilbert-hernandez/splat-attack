import { RULES } from '../config/rules.js';

// What a CPU rival may know: only what a player could see. The piece and gunk streams, and pairs
// past the preview, are never copied, so the planner can't read them by accident.

/**
 * @typedef {object} Seen
 * @property {number} tick
 * @property {number[]} grid
 * @property {number[]} stains
 * @property {import('../core/pair.js').Pair | null} pair
 * @property {number[][]} queue the preview pairs only
 * @property {number} pending
 * @property {number} meter
 * @property {number} meterLock
 * @property {boolean} armed
 * @property {string} phase
 * @property {number} pairs
 * @property {number} score
 * @property {{grid: number[], stains: number[], pending: number, meter: number, score: number} | null} opponent
 */

/**
 * A copy of the visible parts of a rival's board and its opponent's.
 * @param {import('../core/engine.js').State} board
 * @param {import('../core/engine.js').State | null} [opponent]
 * @returns {Seen}
 */
export function seen(board, opponent = null) {
  return {
    tick: board.tick,
    grid: [...board.grid],
    stains: [...board.stains],
    pair: board.pair ? { ...board.pair } : null,
    queue: board.queue.slice(0, RULES.nextPairs).map((pair) => [...pair]),
    pending: board.pending,
    meter: board.meter,
    meterLock: board.meterLock,
    armed: board.armed,
    phase: board.phase,
    pairs: board.pairs,
    score: board.score,
    opponent: opponent
      ? {
          grid: [...opponent.grid],
          stains: [...opponent.stains],
          pending: opponent.pending,
          meter: opponent.meter,
          score: opponent.score,
        }
      : null,
  };
}
