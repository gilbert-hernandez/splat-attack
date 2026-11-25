import { CLOCK } from '../config/input.js';
import { createState, step } from '../core/engine.js';
import { createReplay, recordInput } from '../core/replay.js';

// Absorbs rounding when frame times are added up.
const EPSILON = 1e-6;

/** Owns a match: turns frame time into engine ticks, and records the inputs. */
export default class MatchRunner {
  /**
   * @param {object} options
   * @param {number} options.seed
   * @param {() => number} options.readInput the next tick's mask
   * @param {(state: import('../core/engine.js').State, events: import('../core/engine.js').Event[]) => void} [options.onTick]
   *   called after every tick, also once the match is over, so animations can finish
   */
  constructor({ seed, readInput, onTick = () => {} }) {
    this.state = createState(seed);
    this.replay = createReplay(seed);
    this.readInput = readInput;
    this.onTick = onTick;
    /** When true, only advance() ticks. */
    this.manual = false;
    /** Ticks owed. */
    this.owed = 0;
  }

  /** @param {number} deltaMs frame time */
  update(deltaMs) {
    if (this.manual) return;
    this.owed += (deltaMs * CLOCK.ticksPerSecond) / 1000;
    const due = Math.floor(this.owed + EPSILON);
    this.owed = due > CLOCK.maxTicksPerFrame ? 0 : this.owed - due;
    this.advance(Math.min(due, CLOCK.maxTicksPerFrame));
  }

  /**
   * Runs ticks at once.
   * @param {number} ticks
   * @param {number} [mask] input for every tick, instead of reading it
   */
  advance(ticks, mask) {
    for (let i = 0; i < ticks; i++) {
      const input = mask ?? this.readInput();
      recordInput(this.replay, this.state, input);
      this.onTick(this.state, step(this.state, input));
    }
  }
}
