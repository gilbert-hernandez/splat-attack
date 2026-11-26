import { CONTROLS } from '../config/input.js';
import { INPUT } from '../core/engine.js';

const BITS = {
  left: INPUT.LEFT,
  right: INPUT.RIGHT,
  cw: INPUT.ROTATE_CW,
  ccw: INPUT.ROTATE_CCW,
  drop: INPUT.SOFT_DROP,
};
const isMove = (action) => action === 'left' || action === 'right';

/** Turns key presses into one input mask per tick. No Phaser and no clock. */
export default class MatchInput {
  constructor() {
    this.releaseAll();
  }

  /** Forgets held keys and unused presses. */
  releaseAll() {
    /** Held codes, oldest first. @type {string[]} */
    this.held = [];
    this.pendingMove = 0;
    this.pendingTurns = 0;
    /** Ticks since the acting move key began repeating. */
    this.charge = 0;
  }

  /** @param {string} code KeyboardEvent.code */
  press(code) {
    const action = CONTROLS.keys[code];
    // Phaser can deliver one press twice, and the system repeats held keys.
    if (!action || this.held.includes(code)) return;
    this.held.push(code);
    if (isMove(action)) {
      this.pendingMove = BITS[action];
      this.charge = 0;
    } else if (action !== 'drop') {
      this.pendingTurns |= BITS[action];
    }
  }

  /**
   * An on-screen rotate button was pressed: acts once on the next tick, like a key tap, and holds nothing.
   * @param {'cw' | 'ccw'} action
   */
  turn(action) {
    this.pendingTurns |= BITS[action];
  }

  /** @param {string} code */
  release(code) {
    const before = this.heldMove();
    this.held = this.held.filter((c) => c !== code);
    if (this.heldMove() !== before) this.charge = 0;
  }

  /** The move key pressed last among those held, as an action. */
  heldMove() {
    return this.held
      .map((code) => CONTROLS.keys[code])
      .filter(isMove)
      .at(-1);
  }

  /** The mask for the next tick. Call once per tick. */
  next() {
    let mask = this.pendingTurns | this.pendingMove;
    if (this.held.some((code) => CONTROLS.keys[code] === 'drop')) mask |= INPUT.SOFT_DROP;
    const move = this.heldMove();
    if (move && this.pendingMove === 0) {
      this.charge++;
      const past = this.charge - CONTROLS.repeatDelay;
      if (past >= 0 && past % CONTROLS.repeatInterval === 0) mask |= BITS[move];
    }
    this.pendingMove = 0;
    this.pendingTurns = 0;
    return mask;
  }
}
