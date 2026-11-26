import { RULES, VIEW } from '../config/index.js';
import SpritePool from './SpritePool.js';

// Pending gunk as icons: a full drop, a row and single gunk, largest first.
// While the art is missing, the placeholders all look alike, so they are drawn at different sizes.
const ICONS = [
  { key: 'ui_gunk_large', gunk: RULES.attack.maxDrop, placeholderSize: 4 },
  { key: 'ui_gunk_medium', gunk: RULES.columns, placeholderSize: 3 },
  { key: 'ui_gunk_small', gunk: 1, placeholderSize: 2 },
];
const PLACEHOLDER_SIZES = 4;
const DEPTH = 7;

/**
 * The icon keys for a pending count, largest first, at most `max` of them.
 * @param {number} count
 * @param {number} max
 * @returns {string[]}
 */
export function pendingIcons(count, max) {
  const keys = [];
  let left = count;
  for (const { key, gunk } of ICONS) {
    while (left >= gunk && keys.length < max) {
      keys.push(key);
      left -= gunk;
    }
  }
  return keys;
}

/** One board's pending gunk, drawn left to right in its strip. Shows nothing when none is pending. */
export default class PendingView {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.pool = new SpritePool(scene, { depth: DEPTH });
    this.rect = { x: 0, y: 0, width: 0, height: 0 };
    this.count = 0;
    this.placeholders = scene.registry.get('placeholders') ?? [];
  }

  /** @param {{x: number, y: number, width: number, height: number}} rect */
  place(rect) {
    this.rect = rect;
    this.draw();
  }

  /** @param {number} count the engine's pending gunk */
  show(count) {
    if (count === this.count) return;
    this.count = count;
    this.draw();
  }

  draw() {
    const { x, y, width, height } = this.rect;
    const step = height + VIEW.pendingIconGap;
    const max = Math.min(VIEW.pendingIcons, Math.floor((width + VIEW.pendingIconGap) / step));
    this.pool.begin();
    pendingIcons(this.count, max).forEach((key, i) => {
      const { placeholderSize } = ICONS.find((icon) => icon.key === key);
      const size = this.placeholders.includes(key) ? (height * placeholderSize) / PLACEHOLDER_SIZES : height;
      const inset = (height - size) / 2;
      this.pool.place(x + i * step + inset, y + inset, key).setDisplaySize(size, size);
    });
    this.pool.end();
  }
}
