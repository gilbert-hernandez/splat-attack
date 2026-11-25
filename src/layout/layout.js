import { LAYOUT, SCREENS } from '../config/layout.js';

/** @typedef {{orientation: 'portrait' | 'landscape', width: number, height: number}} Screen */
/** @typedef {typeof LAYOUT.landscape & {screen: Screen}} Layout */

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

/**
 * Where everything goes on a screen. Menus are centered in extra height; a match keeps its place at
 * the top and gives the extra to its touch area.
 * @param {Screen} screen
 * @returns {Layout}
 */
export function layoutFor(screen) {
  const { orientation, height } = screen;
  const extra = orientation === 'portrait' ? height - SCREENS.portrait.minHeight : 0;
  /** @type {any} */
  const layout = { screen };
  for (const [key, part] of Object.entries(LAYOUT[orientation])) {
    const fixed = key === 'match' || key === 'ui';
    layout[key] = fit(part, fixed ? 0 : extra / 2, height);
  }
  const { areas } = layout.match;
  if (areas) areas.touch.height += extra;
  return layout;
}
