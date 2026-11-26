import { TOUCH } from '../config/touch.js';
import { INPUT } from '../core/engine.js';

/**
 * The finger that owns the gesture.
 * @typedef {object} Press
 * @property {number} id
 * @property {number} x where it began, in game pixels
 * @property {number} y
 * @property {number} scale CSS pixels per game pixel
 * @property {'undecided' | 'sideways' | 'drop' | 'done'} kind
 * @property {boolean} tap whether it can still be a tap
 * @property {number} ticks how long it has been down
 * @property {number} anchor x from which the next step is measured, once sideways
 */

/** Turns one finger's touches into one input mask per tick. No Phaser and no clock. */
export default class TouchGestures {
  constructor() {
    this.releaseAll();
  }

  /** Forgets the finger, queued moves and unused taps. */
  releaseAll() {
    /** @type {Press | null} */
    this.press = null;
    /** Columns still to move: negative is left. */
    this.queue = 0;
    this.pendingTap = false;
  }

  /**
   * A finger went down. Ignored while another owns the gesture.
   * @param {number} id
   * @param {number} x in game pixels
   * @param {number} y
   * @param {number} scale CSS pixels per game pixel
   */
  begin(id, x, y, scale) {
    if (this.press) return;
    this.press = { id, x, y, scale, kind: 'undecided', tap: true, ticks: 0, anchor: x };
  }

  /** @param {number} id */
  move(id, x, y) {
    const { press } = this;
    if (press?.id !== id) return;
    if (press.kind === 'undecided') this.decide(press, x, y);
    if (press.kind === 'sideways') this.slide(press, x);
  }

  /** Picks the press's axis once it has travelled far enough in a clear direction. */
  decide(press, x, y) {
    const dx = x - press.x;
    const dy = y - press.y;
    const across = Math.abs(dx);
    if (Math.hypot(dx, dy) * press.scale < TOUCH.dragStart) return;
    press.tap = false;
    if (dy > 0 && dy >= across * TOUCH.dropBias) press.kind = 'drop';
    else if (across > Math.abs(dy)) {
      press.kind = 'sideways';
      press.anchor = press.x - Math.sign(dx) * stepOf(press) * (1 - TOUCH.firstStep);
    }
  }

  /** Queues a move for each step crossed. Turning back takes a whole step, so it doesn't jitter. */
  slide(press, x) {
    const step = stepOf(press);
    const steps = Math.trunc((x - press.anchor) / step);
    press.anchor += steps * step;
    this.queue = Math.max(-TOUCH.maxQueue, Math.min(TOUCH.maxQueue, this.queue + steps));
  }

  /** The finger lifted. @param {number} id */
  end(id) {
    const { press } = this;
    if (press?.id !== id) return;
    if (press.tap && press.ticks <= TOUCH.tapTicks) this.pendingTap = true;
    this.press = null;
  }

  /** The system took the touch away. @param {number} id */
  cancel(id) {
    if (this.press?.id === id) this.releaseAll();
  }

  /** The pair locked: what's left was meant for it, not the next one. */
  lock() {
    this.queue = 0;
    this.pendingTap = false;
    if (!this.press) return;
    this.press.tap = false;
    if (this.press.kind === 'drop') this.press.kind = 'done';
  }

  /**
   * The mask for the next tick. Call once per tick.
   * @param {boolean} [moves] false while moves and rotations are held back (the meter choice is open):
   *   queued moves and taps are dropped, and only soft drop passes
   */
  next(moves = true) {
    if (!moves) {
      this.queue = 0;
      this.pendingTap = false;
    }
    let mask = 0;
    if (this.press) this.press.ticks++;
    if (this.press?.kind === 'drop') mask |= INPUT.SOFT_DROP;
    if (this.pendingTap) mask |= INPUT.ROTATE_CW;
    this.pendingTap = false;
    if (this.queue !== 0) {
      mask |= this.queue < 0 ? INPUT.LEFT : INPUT.RIGHT;
      this.queue -= Math.sign(this.queue);
    }
    return mask;
  }
}

/** A column's finger travel in game pixels. */
function stepOf({ scale }) {
  return Math.max(TOUCH.columnStep, TOUCH.minColumnStep / scale);
}
