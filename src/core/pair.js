import { RULES } from '../config/rules.js';
import { isFree } from './grid.js';

// The falling pair: a pivot at (col, row) and another half next to it. Collision uses whole rows.

/**
 * @typedef {object} Pair
 * @property {number} pivot color of the pivot
 * @property {number} other color of the other half
 * @property {number} col
 * @property {number} row
 * @property {number} orientation where the other half is: UP, RIGHT, DOWN or LEFT of the pivot
 * @property {number} progress toward the next row, in 1/RULES.rowUnits
 * @property {number} budget lock budget left
 */

export const UP = 0;
export const RIGHT = 1;
export const DOWN = 2;
export const LEFT = 3;

const OFFSETS = [
  { col: 0, row: -1 },
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
];

/** Where the other half is. @param {Pair} pair */
export function otherCell(pair) {
  const offset = OFFSETS[pair.orientation];
  return { col: pair.col + offset.col, row: pair.row + offset.row };
}

function fits(grid, col, row, orientation) {
  const offset = OFFSETS[orientation];
  return isFree(grid, col, row) && isFree(grid, col + offset.col, row + offset.row);
}

/** @param {Pair} pair */
export function isGrounded(grid, pair) {
  return !fits(grid, pair.col, pair.row + 1, pair.orientation);
}

/**
 * Moves one column if there's room.
 * @param {Pair} pair
 * @param {number} direction -1, 0 or 1
 */
export function movePair(grid, pair, direction) {
  if (fits(grid, pair.col + direction, pair.row, pair.orientation)) pair.col += direction;
}

/** Turns to an orientation in place or with a kick. Returns false, changing nothing, if neither fits. */
function tryTurn(grid, pair, orientation) {
  // A kick moves the pivot away from where the other half points.
  const offset = OFFSETS[orientation];
  const inPlace = fits(grid, pair.col, pair.row, orientation);
  const col = inPlace ? pair.col : pair.col - offset.col;
  const row = inPlace ? pair.row : pair.row - offset.row;
  // Upward turns don't kick: nothing pushes a pair down a row.
  if (!inPlace && (orientation === UP || !fits(grid, col, row, orientation))) return false;
  if (row < pair.row) pair.budget = Math.max(0, pair.budget - RULES.floorKickCost);
  pair.col = col;
  pair.row = row;
  pair.orientation = orientation;
  return true;
}

/**
 * Rotates a quarter turn, kicking if blocked. If a sideways turn is blocked on both sides, flips.
 * @param {Pair} pair
 * @param {number} direction 1 clockwise, -1 counterclockwise
 */
export function rotatePair(grid, pair, direction) {
  const target = (pair.orientation + direction + 4) % 4;
  if (tryTurn(grid, pair, target)) return;
  if (target === RIGHT || target === LEFT) tryTurn(grid, pair, (pair.orientation + 2) % 4);
}

/**
 * Advances the fall by some progress, stopping at the ground.
 * @param {Pair} pair
 */
export function fallPair(grid, pair, speed) {
  // Progress is kept while grounded, so sliding on and off a bump doesn't slow the fall.
  if (isGrounded(grid, pair)) return;
  pair.progress += speed;
  if (pair.progress < RULES.rowUnits) return;
  pair.progress -= RULES.rowUnits;
  pair.row++;
}
