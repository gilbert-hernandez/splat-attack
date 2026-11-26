import { LAYOUT, SCREENS } from '../config/layout.js';

/** @typedef {{orientation: 'portrait' | 'landscape', width: number, height: number}} Screen */
/** @typedef {import('../ui/inputMode.js').Mode} Mode */
/** @typedef {Omit<typeof LAYOUT.landscape, 'touch'> & {screen: Screen, mode: Mode}} Layout */

/**
 * The game's size for a window of this size, or null if the window has no size.
 * @returns {Screen | null}
 */
export function screenFor(width, height) {
  if (!(width > 0 && height > 0)) return null;
  if (width >= height) return { orientation: 'landscape', ...SCREENS.landscape };
  const { width: across, minHeight, maxHeight } = SCREENS.portrait;
  // Even, so centers are whole pixels.
  const fitting = Math.floor((across * height) / width / 2) * 2;
  return { orientation: 'portrait', width: across, height: Math.min(maxHeight, Math.max(minHeight, fitting)) };
}

/** Moves every `y` in a layout down by `shift`, and turns `bottom` into `y`. */
function fit(part, shift, height) {
  if (typeof part !== 'object') return part;
  const out = {};
  for (const [key, value] of Object.entries(part)) {
    if (key === 'bottom') out.y = height - value;
    else out[key] = key === 'y' ? value + shift : fit(value, shift, height);
  }
  return out;
}

/** Replaces `base`'s keys that `changes` has, recursing into objects that both have. */
function merge(base, changes) {
  const out = { ...base };
  for (const [key, value] of Object.entries(changes)) {
    const both = typeof value === 'object' && typeof base[key] === 'object';
    out[key] = both ? merge(base[key], value) : value;
  }
  return out;
}

/**
 * Where everything goes on a screen. Menus are centered in extra height; a match keeps its place at
 * the top and gives the extra to its touch area, where its buttons stay centered.
 * @param {Screen} screen
 * @param {Mode} [mode]
 * @returns {Layout}
 */
export function layoutFor(screen, mode = 'keyboard') {
  const { orientation, height } = screen;
  const extra = orientation === 'portrait' ? height - SCREENS.portrait.minHeight : 0;
  const { touch, ...parts } = LAYOUT[orientation];
  /** @type {any} */
  const layout = { screen, mode };
  for (const [key, part] of Object.entries(mode === 'touch' && touch ? merge(parts, touch) : parts)) {
    const fixed = key === 'match' || key === 'ui';
    layout[key] = fit(part, fixed ? 0 : extra / 2, height);
  }
  const { areas, buttons } = layout.match;
  if (areas) {
    areas.touch.height += extra;
    for (const name of ['ccw', 'meter', 'cw']) buttons[name].y += extra / 2;
  }
  return layout;
}
