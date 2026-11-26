import { asset, COLORS } from '../assets/manifest.js';
import { RULES } from '../config/rules.js';
import { VIEW } from '../config/view.js';
import { COLUMNS, CRACKED, EMPTY, GUNK, ROWS, cellAt, isColor } from '../core/grid.js';
import { landingCells } from '../core/landing.js';
import PairModel, { eased } from './pairModel.js';

// What to draw for a board, worked out from the state and its events. Reads the state only.
// Positions are in cells: (0, 0) is the top-left hidden cell.

/**
 * @typedef {object} Blob
 * @property {number} color
 * @property {number} col
 * @property {number} row
 * @property {{from: number, start: number, ticks: number} | null} fall
 * @property {number | null} landAt the tick its landing animation starts
 * @property {{x: number, y: number, left: number}} offset left over from the falling pair's easing
 */

/**
 * A blob or gunk to draw. `color` is its cell value; `key` and `frame` pick its texture.
 * @typedef {{color: number, anim: 'idle' | 'land' | 'splat' | 'break', key: string, frame: number, x: number, y: number}} Drawn
 */

const idOf = (col, row) => row * COLUMNS + col;
const GUNK_KEYS = { [GUNK]: 'gunk_whole', [CRACKED]: 'gunk_cracked' };
const BREAK_KEY = 'gunk_break';

/** A blob's texture for an animation; gunk has one look per state. */
export function keyOf(color, anim) {
  return isColor(color) ? `blob_${COLORS[color - 1].name}_${anim}` : GUNK_KEYS[color];
}

const frameCount = (color, anim) => asset(keyOf(color, anim)).frames;
const isVisible = (row) => row >= RULES.hiddenRows;

export default class BoardModel {
  /** @param {import('../core/engine.js').State} state */
  constructor(state) {
    this.ticks = 0;
    this.state = state;
    /** @type {Map<number, Blob>} */
    this.blobs = new Map();
    /** @type {{color: number, col: number, row: number, start: number}[]} */
    this.splats = [];
    /** Cleared gunk still crumbling. @type {{col: number, row: number, start: number}[]} */
    this.breaks = [];
    // The wall as drawn: changes when a splat starts, so stains appear under the splat animation.
    this.stains = [...state.stains];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const color = cellAt(state.grid, col, row);
        if (color !== EMPTY) this.addBlob(color, col, row);
      }
    }
    this.pair = state.pair ? new PairModel(state) : null;
  }

  addBlob(color, col, row, offset = { x: 0, y: 0, left: 0 }) {
    /** @type {Blob} */
    const blob = { color, col, row, fall: null, landAt: null, offset };
    this.blobs.set(idOf(col, row), blob);
    return blob;
  }

  /**
   * Call once after each engine tick.
   * @param {import('../core/engine.js').State} state
   * @param {import('../core/engine.js').Event[]} events
   */
  tick(state, events) {
    this.ticks++;
    this.state = state;
    for (const blob of this.blobs.values()) blob.offset.left = Math.max(0, blob.offset.left - 1);
    this.splats = this.splats.filter((splat) => this.ticks - splat.start < RULES.splatTicks);
    this.breaks = this.breaks.filter((crumb) => this.ticks - crumb.start < RULES.splatTicks);
    for (const event of events) {
      if (event.type === 'lock') this.lock(event.cells);
      else if (event.type === 'settle') this.settle(event.falls);
      else if (event.type === 'splat') this.splat(event.groups);
      else if (event.type === 'gunkHit') this.hit(event.cracked, event.cleared);
      else if (event.type === 'drop') this.drop(event.cells);
    }
    if (!state.pair) this.pair = null;
    else if (this.pair) this.pair.tick(state);
    else this.pair = new PairModel(state);
  }

  lock(cells) {
    const drawn = this.pair.positions();
    cells.forEach(({ col, row, color }, i) => {
      // Blobs carry on from where the pair was drawn.
      const offset = { x: drawn[i].x - col, y: drawn[i].y - row, left: VIEW.easeTicks };
      this.addBlob(color, col, row, offset).landAt = this.ticks;
    });
  }

  settle(falls) {
    for (const { col, from, to } of falls) {
      const blob = this.blobs.get(idOf(col, from));
      const ticks = Math.ceil(RULES.settleTicks * Math.sqrt((to - from) / (ROWS - 1)));
      this.blobs.delete(idOf(col, from));
      this.blobs.set(idOf(col, to), blob);
      blob.row = to;
      blob.fall = { from, start: this.ticks, ticks };
      blob.landAt = this.ticks + ticks;
    }
  }

  splat(groups) {
    for (const { color, cells } of groups) {
      for (const { col, row } of cells) {
        this.stains[idOf(col, row)] = color;
        this.blobs.delete(idOf(col, row));
        this.splats.push({ color, col, row, start: this.ticks });
      }
    }
  }

  hit(cracked, cleared) {
    for (const { col, row } of cracked) this.blobs.get(idOf(col, row)).color = CRACKED;
    for (const { col, row } of cleared) {
      this.blobs.delete(idOf(col, row));
      this.breaks.push({ col, row, start: this.ticks });
    }
  }

  /** New gunk falls in from above the top edge, each column's lowest just above it. */
  drop(cells) {
    const lowest = new Map();
    for (const { col, row } of cells) lowest.set(col, Math.max(lowest.get(col) ?? row, row));
    for (const { col, row } of cells) {
      const distance = lowest.get(col) - (RULES.hiddenRows - 1);
      const ticks = Math.max(1, Math.ceil(RULES.settleTicks * Math.sqrt(distance / (ROWS - 1))));
      const blob = this.addBlob(GUNK, col, row);
      blob.fall = { from: row - distance, start: this.ticks, ticks };
      blob.landAt = this.ticks + ticks;
    }
  }

  isFalling({ fall }) {
    return fall !== null && this.ticks - fall.start < fall.ticks;
  }

  isAtRest(blob) {
    return !this.isFalling(blob) && blob.offset.left === 0;
  }

  idleFrame(color) {
    return Math.floor(this.ticks / VIEW.idleFrameTicks) % frameCount(color, 'idle');
  }

  /** @returns {Drawn} */
  drawBlob(blob) {
    const { color, col, row, fall, landAt } = blob;
    const offset = eased(blob.offset);
    let y = row;
    if (this.isFalling(blob)) {
      const share = (this.ticks - fall.start) / fall.ticks;
      y = fall.from + (row - fall.from) * share * share;
    }
    const x = col + offset.x;
    if (!isColor(color)) return { color, anim: 'idle', key: keyOf(color, 'idle'), frame: 0, x, y: y + offset.y };
    const landFrame = landAt === null ? -1 : Math.floor((this.ticks - landAt) / VIEW.landFrameTicks);
    const landing = landFrame >= 0 && landFrame < frameCount(color, 'land');
    const anim = landing ? 'land' : 'idle';
    return {
      color,
      anim,
      key: keyOf(color, anim),
      frame: landing ? landFrame : this.idleFrame(color),
      x,
      y: y + offset.y,
    };
  }

  /** Every blob and gunk on the board, including splats and breaks still playing. @returns {Drawn[]} */
  drawBlobs() {
    const splats = this.splats.map(({ color, col, row, start }) => {
      const frame = Math.floor(((this.ticks - start) * frameCount(color, 'splat')) / RULES.splatTicks);
      return { color, anim: /** @type {const} */ ('splat'), key: keyOf(color, 'splat'), frame, x: col, y: row };
    });
    const breaks = this.breaks.map(({ col, row, start }) => {
      const frame = Math.floor(((this.ticks - start) * asset(BREAK_KEY).frames) / RULES.splatTicks);
      return { color: CRACKED, anim: /** @type {const} */ ('break'), key: BREAK_KEY, frame, x: col, y: row };
    });
    return [...[...this.blobs.values()].map((blob) => this.drawBlob(blob)), ...splats, ...breaks];
  }

  /** Stained cells in the visible rows, under everything else. */
  drawStains() {
    const stains = [];
    for (let row = RULES.hiddenRows; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const color = this.stains[idOf(col, row)];
        if (color !== EMPTY) stains.push({ col, row, color });
      }
    }
    return stains;
  }

  /** Links between neighbors, at the center of their shared edge. */
  drawBridges() {
    const bridges = [];
    for (const blob of this.blobs.values()) {
      const { color, col, row } = blob;
      if (!isVisible(row) || !this.isAtRest(blob)) continue;
      if (!isColor(color)) continue;
      const joins = (other) => other && other.color === color && this.isAtRest(other);
      if (col + 1 < COLUMNS && joins(this.blobs.get(idOf(col + 1, row)))) {
        bridges.push({ color, direction: 'h', x: col + 1, y: row + 0.5 });
      }
      if (joins(this.blobs.get(idOf(col, row + 1)))) {
        bridges.push({ color, direction: 'v', x: col + 0.5, y: row + 1 });
      }
    }
    return bridges;
  }

  /** The falling pair, [pivot, other], or nothing. @returns {Drawn[]} */
  drawPair() {
    const { pair } = this.state;
    if (!pair || !this.pair) return [];
    const colors = [pair.pivot, pair.other];
    return this.pair.positions().map(({ x, y }, i) => {
      const color = colors[i];
      return {
        color,
        anim: /** @type {const} */ ('idle'),
        key: keyOf(color, 'idle'),
        frame: this.idleFrame(color),
        x,
        y,
      };
    });
  }

  /** Where the pair will rest, visible rows only. */
  drawGhost() {
    const { grid, pair } = this.state;
    if (!pair) return [];
    return landingCells(grid, pair).filter(({ row }) => isVisible(row));
  }

  /** The next pairs, nearest first, each [pivot, other]. */
  drawNext() {
    return this.state.queue;
  }
}
