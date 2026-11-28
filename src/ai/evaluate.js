import { RULES } from '../config/rules.js';
import { SPAWN } from '../core/engine.js';
import { COLUMNS, EMPTY, ROWS, applyGravity, cellAt, isGunk, setCell } from '../core/grid.js';
import { hitGunk } from '../core/gunk.js';
import { explode } from '../core/meter.js';
import { UP, isGrounded, movePair, otherCell, rotatePair } from '../core/pair.js';
import { findGroups, splatPoints, splatPower } from '../core/splat.js';
import { applyStains } from '../core/stain.js';

// Simulates a rival's moves with the engine's own rules, on copies, and rates the boards they leave.

/** A move's value when it tops out: worse than anything else. */
export const FATAL = -1000000000;

/** @typedef {{grid: number[], stains: number[]}} Board */

/**
 * @typedef {object} Outcome what one placement did
 * @property {number[]} grid
 * @property {number[]} stains
 * @property {number} chain
 * @property {number} points
 * @property {number} power
 * @property {number} stainMatches
 * @property {boolean} toppedOut the spawn cell is filled after the chain
 */

/** The turn direction a rival uses toward an orientation: counterclockwise only for a quarter back. */
export function turnFor(from, to) {
  return (to - from + 4) % 4 === 3 ? -1 : 1;
}

/**
 * Steers a copy of the pair the way a rival does: turn the short way, then move one column at a
 * time. Falling is ignored.
 * @param {number[]} grid
 * @param {import('../core/pair.js').Pair} pair
 * @param {number} col
 * @param {number} orientation
 * @returns {import('../core/pair.js').Pair | null} the steered pair, or null if it can't get there
 */
export function steer(grid, pair, col, orientation) {
  const p = { ...pair };
  for (let i = 0; i < 3 && p.orientation !== orientation; i++) {
    rotatePair(grid, p, turnFor(p.orientation, orientation));
  }
  if (p.orientation !== orientation) return null;
  while (p.col !== col) {
    const from = p.col;
    movePair(grid, p, p.col < col ? 1 : -1);
    if (p.col === from) return null;
  }
  return p;
}

/** The pair dropped straight down until it's grounded. */
export function land(grid, pair) {
  const p = { ...pair };
  while (!isGrounded(grid, p)) p.row++;
  return p;
}

/**
 * Every distinct place the pair can reach and land, as { col, orientation, pair } with the landed
 * pair. Two placements that put the same colors on the same cells count once.
 */
export function placements(grid, pair) {
  const found = [];
  const keys = new Set();
  for (const orientation of [UP, 1, 2, 3]) {
    for (let col = 0; col < COLUMNS; col++) {
      const steered = steer(grid, pair, col, orientation);
      if (!steered) continue;
      const landed = land(grid, steered);
      const other = otherCell(landed);
      const a = `${landed.col},${landed.row},${landed.pivot}`;
      const b = `${other.col},${other.row},${landed.other}`;
      const key = a < b ? `${a};${b}` : `${b};${a}`;
      if (keys.has(key)) continue;
      keys.add(key);
      found.push({ col, orientation, pair: landed });
    }
  }
  return found;
}

/** A pair waiting at the spawn cell, as the engine brings it in. */
/** @param {number[]} colors [pivot, other] */
export function spawnPair([pivot, other]) {
  return { pivot, other, ...SPAWN, orientation: UP, progress: 0, budget: RULES.lockBudget };
}

/**
 * Locks a landed pair on copies of the board and runs its whole chain, as the engine does.
 * @param {Board} board
 * @param {import('../core/pair.js').Pair} pair
 * @returns {Outcome}
 */
export function simulate({ grid, stains }, pair) {
  const g = [...grid];
  // Boards are never changed once made, so the stains are copied only when a splat changes them.
  let s = stains;
  const other = otherCell(pair);
  setCell(g, pair.col, pair.row, pair.pivot);
  setCell(g, other.col, other.row, pair.other);
  applyGravity(g);
  let chain = 0;
  let points = 0;
  let power = 0;
  let stainMatches = 0;
  for (let found = findGroups(g); found.length > 0; found = findGroups(g)) {
    chain++;
    if (s === stains) s = [...stains];
    const matched = applyStains(s, found);
    const groups = found.map((group, i) => ({ ...group, matched: matched[i] }));
    for (const { cells } of groups) for (const { col, row } of cells) setCell(g, col, row, EMPTY);
    points += splatPoints(groups, chain);
    power += splatPower(groups, chain);
    for (const cells of matched) stainMatches += cells.length;
    hitGunk(g, groups);
    applyGravity(g);
  }
  return { grid: g, stains: s, chain, points, power, stainMatches, toppedOut: blocked(g) };
}

/** True when the spawn cell is filled, which ends a match at the next spawn. */
export function blocked(grid) {
  return cellAt(grid, SPAWN.col, SPAWN.row) !== EMPTY;
}

/**
 * Copies of the board after a Bomb from this pair, by the engine's own Bomb.
 * @param {Board} board
 * @param {import('../core/pair.js').Pair} pair
 * @returns {Board}
 */
export function bombed({ grid, stains }, pair) {
  const copy = { grid: [...grid], stains: [...stains], pair: { ...pair } };
  explode(copy);
  return { grid: copy.grid, stains: copy.stains };
}

/**
 * The value of what a placement did right away, and the pending gunk left after its attack cancels.
 * - points: chain points
 * - attack: per gunk sent; cancel: per pending gunk cancelled
 * - stainMatch: per blob that splatted on its own stain
 * A chain shorter than `fire.at` steps is worth `fire.smallPercent` of that.
 * @param {Outcome} outcome
 * @param {number} pending
 * @param {Record<string, number>} weights
 * @param {{at: number, smallPercent: number}} [fire]
 */
export function rateMove(
  { chain, points, power, stainMatches },
  pending,
  weights,
  fire = { at: 1, smallPercent: 100 },
) {
  const gunk = Math.floor(power / RULES.attack.powerPerGunk);
  const cancelled = Math.min(gunk, pending);
  const value =
    weights.points * points +
    weights.attack * (gunk - cancelled) +
    weights.cancel * cancelled +
    weights.stainMatch * stainMatches;
  // A chain shorter than the rival likes to fire is worth only part of its value.
  const scaled = chain > 0 && chain < fire.at ? Math.floor((value * fire.smallPercent) / 100) : value;
  return { value: scaled, pending: pending - cancelled };
}

/**
 * The value of a board's shape:
 * - links: per pair of same-color neighbors
 * - height: per filled cell, and per pending gunk
 * - spawnColumn: per square of the spawn column's height
 * - gunk: per gunk on the board
 * - stainSetup: per blob resting on its own color's stain
 * With a persona's preferences (SA-11):
 * - colorLinks: per pair of same-color neighbors of a preferred color, on top of links
 * A topped-out board is FATAL.
 * @param {Board} board
 * @param {number} pending
 * @param {Record<string, number>} weights
 * @param {Prefs | null} [prefs]
 */
export function rateShape({ grid, stains }, pending, weights, prefs = null) {
  if (blocked(grid)) return FATAL;
  let links = 0;
  let filled = pending;
  let gunk = 0;
  let onStain = 0;
  let liked = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const value = cellAt(grid, col, row);
      if (value === EMPTY) continue;
      filled++;
      if (isGunk(value)) {
        gunk++;
        continue;
      }
      if (row < RULES.hiddenRows) continue;
      if (cellAt(stains, col, row) === value) onStain++;
      let joined = 0;
      if (col + 1 < COLUMNS && cellAt(grid, col + 1, row) === value) joined++;
      if (row + 1 < ROWS && cellAt(grid, col, row + 1) === value) joined++;
      links += joined;
      if (prefs && prefs.colorMask & (1 << value)) liked += joined;
    }
  }
  const spawn = heightOf(grid, SPAWN.col);
  const shape =
    weights.links * links +
    weights.height * filled +
    weights.spawnColumn * spawn * spawn +
    weights.gunk * gunk +
    weights.stainSetup * onStain;
  return prefs ? shape + weights.colorLinks * liked : shape;
}

/**
 * A persona's nudge toward its side of the board, for a first move only: `area` per cell of the
 * landed pair in the lower half of the board, times its closeness to the preferred column (3 at it,
 * 0 three or more columns away). Only the placement counts, not the board, so it shapes openings
 * without rewarding a tall stack on one side.
 * @param {import('../core/pair.js').Pair} pair landed
 * @param {Prefs} prefs
 * @param {number} weight
 */
export function rateArea(pair, prefs, weight) {
  const low = RULES.hiddenRows + (RULES.visibleRows >> 1);
  const other = otherCell(pair);
  let near = 0;
  for (const { col, row } of [pair, other]) if (row >= low) near += Math.max(0, 3 - Math.abs(col - prefs.areaCol));
  return weight * near;
}

/**
 * A persona's board preferences.
 * @typedef {object} Prefs
 * @property {number} areaCol the preferred column: 0 (left), 3 (center) or 6 (right)
 * @property {number} colorMask bit `1 << color` set for each preferred color
 */

/** The tallest column's height in cells. */
export function tallest(grid) {
  let most = 0;
  for (let col = 0; col < COLUMNS; col++) most = Math.max(most, heightOf(grid, col));
  return most;
}

/** How many visible blobs rest on a stain of their own color. */
export function onStains({ grid, stains }) {
  let count = 0;
  for (let row = RULES.hiddenRows; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const value = cellAt(grid, col, row);
      if (value !== EMPTY && !isGunk(value) && cellAt(stains, col, row) === value) count++;
    }
  }
  return count;
}

/**
 * The longest chain one more blob could set off on a board, yielding once per probe step, so the
 * reading costs work units like chain setup does.
 * @returns {Generator<undefined, number, undefined>}
 */
export function* longestChain(grid) {
  let longest = 0;
  for (const probe of probes(grid)) longest = Math.max(longest, yield* probeSteps(grid, probe));
  return longest;
}

/** A column's height in cells. Gravity leaves no gaps, so it's the filled count. */
export function heightOf(grid, col) {
  let height = 0;
  for (let row = 0; row < ROWS; row++) if (cellAt(grid, col, row) !== EMPTY) height++;
  return height;
}

/**
 * The probes for chain setup: on top of each column with a free visible cell, one blob of each color
 * next to that cell, kept only if it would complete a group. Probes that would join the same blobs
 * set off the same chain, so only the first is kept.
 * @returns {{col: number, row: number, color: number}[]}
 */
export function probes(grid) {
  const list = [];
  const joined = new Set();
  for (let col = 0; col < COLUMNS; col++) {
    const row = ROWS - 1 - heightOf(grid, col);
    if (row < RULES.hiddenRows) continue;
    for (let color = 1; color <= RULES.colors; color++) {
      const touches =
        (col > 0 && cellAt(grid, col - 1, row) === color) ||
        (col + 1 < COLUMNS && cellAt(grid, col + 1, row) === color) ||
        (row + 1 < ROWS && cellAt(grid, col, row + 1) === color);
      if (!touches) continue;
      const { size, first } = groupWith(grid, col, row, color);
      if (size < RULES.groupSize || joined.has(first * 8 + color)) continue;
      joined.add(first * 8 + color);
      list.push({ col, row, color });
    }
  }
  return list;
}

/**
 * The group a blob of this color would join at an empty visible cell: its size, the blob included,
 * and the lowest cell index among the blobs it joins.
 */
function groupWith(grid, col, row, color) {
  const seen = new Uint8Array(grid.length);
  const stack = [row * COLUMNS + col];
  seen[stack[0]] = 1;
  let size = 0;
  let first = grid.length;
  while (stack.length > 0) {
    const id = stack.pop();
    size++;
    const c = id % COLUMNS;
    const r = Math.floor(id / COLUMNS);
    if (size > 1) first = Math.min(first, id);
    if (c + 1 < COLUMNS) visitCell(grid, id + 1, color, seen, stack);
    if (c > 0) visitCell(grid, id - 1, color, seen, stack);
    if (r + 1 < ROWS) visitCell(grid, id + COLUMNS, color, seen, stack);
    if (r - 1 >= RULES.hiddenRows) visitCell(grid, id - COLUMNS, color, seen, stack);
  }
  return { size, first };
}

function visitCell(grid, id, color, seen, stack) {
  if (seen[id] || grid[id] !== color) return;
  seen[id] = 1;
  stack.push(id);
}

/**
 * Runs the chain one probe blob sets off, yielding after each step, so each step can be counted as a
 * unit of work. Returns the number of steps.
 * @returns {Generator<undefined, number, undefined>}
 */
export function* probeSteps(grid, { col, row, color }) {
  const g = [...grid];
  setCell(g, col, row, color);
  let chain = 0;
  for (let groups = findGroups(g); groups.length > 0; groups = findGroups(g)) {
    chain++;
    for (const { cells } of groups) for (const cell of cells) setCell(g, cell.col, cell.row, EMPTY);
    hitGunk(g, groups);
    applyGravity(g);
    yield;
  }
  return chain;
}

/** How many chain steps one probe blob sets off. */
export function probeChain(grid, probe) {
  const steps = probeSteps(grid, probe);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

/** The chain-setup value for the longest chain one blob could set off: chainSetup × steps². */
export function rateChainSetup(longest, weights) {
  return weights.chainSetup * longest * longest;
}
