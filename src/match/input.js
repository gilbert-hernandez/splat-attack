import { CONTROLS } from '../config/input.js';
import { INPUT } from '../core/engine.js';

const BITS = {
  left: INPUT.LEFT,
  right: INPUT.RIGHT,
  cw: INPUT.ROTATE_CW,
  ccw: INPUT.ROTATE_CCW,
  drop: INPUT.SOFT_DROP,
};
const PICKS = { rinse: INPUT.RINSE, bomb: INPUT.BOMB };
const MOVES = INPUT.LEFT | INPUT.RIGHT | INPUT.ROTATE_CW | INPUT.ROTATE_CCW;
const isMove = (action) => action === 'left' || action === 'right';

/**
 * Turns key presses into one input mask per tick, and holds the meter choice: while it is open, move
 * and rotate keys pick Rinse or Bomb instead of acting. No Phaser and no clock.
 */
export default class MatchInput {
  /**
   * @param {object} [rules] what the board allows, asked when needed
   * @param {() => boolean} [rules.canOpen] whether the choice may open (the meter is full)
   * @param {() => boolean} [rules.canRinse] whether Rinse can be picked (gunk is pending)
   * @param {() => void} [rules.onOpen] the choice opened
   */
  constructor({ canOpen = () => true, canRinse = () => true, onOpen = () => {} } = {}) {
    this.rules = { canOpen, canRinse, onOpen };
    this.releaseAll();
  }

  /** Forgets held keys and unused presses, and closes the choice. */
  releaseAll() {
    /** Held codes, oldest first. @type {string[]} */
    this.held = [];
    /** Held codes that act no more until pressed again: they were held as the choice opened, or picked. */
    this.spent = new Set();
    this.pendingMove = 0;
    this.pendingTurns = 0;
    /** Ticks since the acting move key began repeating. */
    this.charge = 0;
    /** The meter choice: open, ticks left before it closes by itself, and the pick for the next tick. */
    this.choice = { open: false, ticks: 0, picked: 0 };
  }

  /** @param {string} code KeyboardEvent.code */
  press(code) {
    const action = CONTROLS.keys[code];
    // Phaser can deliver one press twice, and the system repeats held keys.
    if (!action || this.held.includes(code)) return;
    this.held.push(code);
    if (action === 'meter') {
      this.toggleChoice();
      return;
    }
    if (this.choice.open && action in CONTROLS.choiceKeys) {
      this.spent.add(code);
      this.pick(CONTROLS.choiceKeys[action]);
      return;
    }
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
    this.spent.delete(code);
    if (this.heldMove() !== before) this.charge = 0;
  }

  /** The move key pressed last among those held and not spent, as an action. */
  heldMove() {
    return this.held
      .filter((code) => !this.spent.has(code))
      .map((code) => CONTROLS.keys[code])
      .filter(isMove)
      .at(-1);
  }

  /** Opens the choice if the board allows it, or closes it. */
  toggleChoice() {
    if (this.choice.open) this.closeChoice();
    else this.openChoice();
  }

  openChoice() {
    if (this.choice.open || !this.rules.canOpen()) return;
    this.choice = { open: true, ticks: CONTROLS.choiceTicks, picked: 0 };
    // Keys already down don't act or pick until pressed again.
    for (const code of this.held) if (CONTROLS.keys[code] !== 'drop') this.spent.add(code);
    this.pendingMove = 0;
    this.pendingTurns = 0;
    this.rules.onOpen();
  }

  /** Closes the choice without firing. */
  closeChoice() {
    this.choice = { open: false, ticks: 0, picked: this.choice.picked };
  }

  /**
   * Picks an option of the open choice: its bit goes out on the next tick and the choice closes. Rinse
   * is ignored while it can't be picked.
   * @param {'rinse' | 'bomb'} option
   */
  pick(option) {
    if (!this.choice.open || (option === 'rinse' && !this.rules.canRinse())) return;
    this.choice = { open: false, ticks: 0, picked: PICKS[option] };
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
    const { choice } = this;
    if (choice.open) {
      mask &= ~MOVES;
      if (--choice.ticks <= 0) this.closeChoice();
    }
    mask |= choice.picked;
    this.choice.picked = 0;
    return mask;
  }
}
