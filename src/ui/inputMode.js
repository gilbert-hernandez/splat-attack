/** @typedef {'touch' | 'keyboard'} Mode */

/**
 * Whether the player is using touch or a keyboard (and mouse). No Phaser and no DOM: `main.js` feeds it
 * events. A touch switches to touch. A mouse press or a game key switches to keyboard, but not while a
 * finger is down, so keys and gestures combine and the layout never moves under a finger.
 */
export default class InputMode {
  /**
   * @param {Mode} mode to start in
   * @param {Iterable<string>} keys KeyboardEvent.code values that switch to keyboard
   * @param {(mode: Mode) => void} onChange
   */
  constructor(mode, keys, onChange) {
    /** @type {Mode} */
    this.mode = mode;
    this.keys = new Set(keys);
    this.onChange = onChange;
    this.fingers = 0;
  }

  /** @param {number} fingers touches on the screen afterwards */
  touchStart(fingers) {
    this.fingers = fingers;
    this.set('touch');
  }

  /** A touch ended or was cancelled. @param {number} fingers touches left on the screen */
  touchEnd(fingers) {
    this.fingers = fingers;
  }

  mousePress() {
    if (this.fingers === 0) this.set('keyboard');
  }

  /** @param {string} code */
  key(code) {
    if (this.fingers === 0 && this.keys.has(code)) this.set('keyboard');
  }

  /** The window lost focus: touches still down won't report their end. */
  blur() {
    this.fingers = 0;
  }

  /** @param {Mode} mode */
  set(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.onChange(mode);
  }
}
