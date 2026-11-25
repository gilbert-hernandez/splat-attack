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
    /** Null once the state was edited: such a match can't be replayed. */
    this.replay = createReplay(seed);
    this.readInput = readInput;
    this.onTick = onTick;
    /** When true, only advance() ticks. */
    this.manual = false;
    /** Frozen by a debug key: like manual. */
    this.frozen = false;
    /** Ticks run per tick owed (fast-forward). */
    this.rate = 1;
    /** Ticks owed. */
    this.owed = 0;
  }

  /** @param {number} deltaMs frame time */
  update(deltaMs) {
    if (this.manual || this.frozen) return;
    this.owed += (deltaMs * CLOCK.ticksPerSecond * this.rate) / 1000;
    const due = Math.floor(this.owed + EPSILON);
    const most = CLOCK.maxTicksPerFrame * this.rate;
    this.owed = due > most ? 0 : this.owed - due;
    this.advance(Math.min(due, most));
  }

  /**
   * Runs ticks at once.
   * @param {number} ticks
   * @param {number} [mask] input for every tick, instead of reading it
   */
  advance(ticks, mask) {
    for (let i = 0; i < ticks; i++) {
      const input = mask ?? this.readInput();
      if (this.replay) recordInput(this.replay, this.state, input);
      this.onTick(this.state, step(this.state, input));
    }
  }

  /** Stops or restarts the clock, forgetting ticks owed. */
  setFrozen(frozen) {
    this.frozen = frozen;
    this.owed = 0;
  }

  /** Call when the state was changed by anything but a tick. */
  dropReplay() {
    this.replay = null;
  }
}
