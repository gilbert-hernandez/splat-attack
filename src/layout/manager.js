import { layoutFor, screenFor } from './layout.js';

/** @typedef {import('./layout.js').Layout} Layout */
/** @typedef {(layout: Layout, rotated: boolean) => void} Place */

/** Keeps the game's size and layout matched to the window, and tells listeners when they change. */
export default class LayoutManager {
  /**
   * @param {any} scale Phaser's scale manager
   * @param {import('./layout.js').Screen} screen the size the game was made with
   */
  constructor(scale, screen) {
    this.scale = scale;
    this.screen = screen;
    this.layout = layoutFor(screen);
    /** @type {Set<Place>} */
    this.listeners = new Set();
    scale.on('resize', () => this.check());
  }

  check() {
    const { width, height } = this.scale.parentSize;
    const screen = screenFor(width, height);
    if (!screen || (screen.width === this.screen.width && screen.height === this.screen.height)) return;
    this.screen = screen;
    // This reports a resize too, which can find a newer size and finish the change itself.
    this.scale.setGameSize(screen.width, screen.height);
    if (this.screen !== screen) return;
    const rotated = this.layout.screen.orientation !== screen.orientation;
    this.layout = layoutFor(screen);
    for (const listener of [...this.listeners]) {
      if (this.listeners.has(listener)) listener(this.layout, rotated);
    }
  }
}

/**
 * Places a scene's objects now and whenever the layout changes, also while it is paused.
 * @param {Phaser.Scene} scene
 * @param {Place} place
 */
export function onLayout(scene, place) {
  /** @type {LayoutManager} */
  const manager = scene.registry.get('layout');
  manager.listeners.add(place);
  scene.events.once('shutdown', () => manager.listeners.delete(place));
  place(manager.layout, false);
}

/**
 * Moves a text, with its font size and wrapping if the layout sets them.
 * @param {any} text
 * @param {any} place from a layout
 */
export function placeText(text, { x, y, size = 0, wrap = 0 }) {
  text.setPosition(x, y);
  if (size) text.setFontSize(size);
  text.setWordWrapWidth(wrap || null);
}
