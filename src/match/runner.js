import { CLOCK } from '../config/input.js';
import { createState, step } from '../core/engine.js';
import { createReplay, isOver, packInputs, recordInput } from '../core/replay.js';
import { createVersus, stepVersus } from '../core/versus.js';

// Absorbs rounding when frame times are added up.
const EPSILON = 1e-6;

/**
 * Owns a match: turns frame time into engine ticks, and records the inputs. A solo match has one
 * board; a versus match also has the rival's, whose input comes from `readRivalInput`.
 */
export default class MatchRunner {
  /**
   * @param {object} options
   * @param {number} options.seed
   * @param {() => number} options.readInput the player's next tick mask
   * @param {(board: import('../core/engine.js').State, opponent: import('../core/engine.js').State) => number}
   *   [options.readRivalInput] makes it a versus match: the rival's next tick mask, from the rival's
   *   board and the player's, both as they are before the tick
   * @param {(state: import('../core/engine.js').State, events: import('../core/engine.js').Event[],
   *   rivalEvents: import('../core/engine.js').Event[] | null) => void} [options.onTick]
   *   called after every tick with the player's board and events (and the rival's events in versus),
   *   also once the match is over, so animations can finish
   */
  constructor({ seed, readInput, readRivalInput, onTick = () => {} }) {
    /** The versus match, or null when solo. */
    this.match = readRivalInput ? createVersus(seed) : null;
    /** The player's board. */
    this.state = this.match ? this.match.boards[0] : createState(seed);
    /** The rival's board, or null when solo. */
    this.rival = this.match ? this.match.boards[1] : null;
    /** Null once the state was edited: such a match can't be replayed. */
    this.replay = createReplay(seed, this.match !== null);
    this.readInput = readInput;
    this.readRivalInput = readRivalInput;
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

  /** True once the match has ended. */
  get over() {
    return isOver(this.match ?? this.state);
  }

  /** @returns {import('../core/versus.js').Outcome} the versus outcome; always null when solo */
  get outcome() {
    return this.match ? this.match.outcome : null;
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
   * @param {number} [mask] the player's input for every tick, instead of reading it
   */
  advance(ticks, mask) {
    for (let i = 0; i < ticks; i++) {
      const input = mask ?? this.readInput();
      if (!this.match) {
        if (this.replay) recordInput(this.replay, this.state, input);
        this.onTick(this.state, step(this.state, input), null);
        continue;
      }
      const rivalInput = this.over ? 0 : this.readRivalInput(this.rival, this.state);
      if (this.replay) recordInput(this.replay, this.match, packInputs(input, rivalInput));
      const [events, rivalEvents] = stepVersus(this.match, input, rivalInput);
      this.onTick(this.state, events, rivalEvents);
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
