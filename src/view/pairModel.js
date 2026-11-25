import { RULES } from '../config/rules.js';
import { VIEW } from '../config/view.js';
import { isGrounded, otherCell } from '../core/pair.js';

const MAX_FALL = RULES.softDropSpeed / RULES.rowUnits;

/** Where the falling pair is drawn, in cells. The engine moves at once; the drawing follows. */
export default class PairModel {
  /** @param {import('../core/engine.js').State} state with a pair */
  constructor(state) {
    this.fallY = targetY(state);
    this.cells = relativeCells(state.pair);
    // Each half's drawing offset when its easing began, and the ticks left.
    this.offsets = [
      { x: 0, y: 0, left: 0 },
      { x: 0, y: 0, left: 0 },
    ];
  }

  /** Call once after each tick. @param {import('../core/engine.js').State} state with a pair */
  tick(state) {
    const target = targetY(state);
    // Upward jumps (kicks, sliding onto a blob) are eased; falling is limited in speed.
    const rise = Math.max(0, this.fallY - target);
    this.fallY = rise > 0 ? target : Math.min(target, this.fallY + MAX_FALL);
    const cells = relativeCells(state.pair);
    this.offsets.forEach((offset, i) => {
      const dx = this.cells[i].col - cells[i].col;
      const dy = this.cells[i].dy - cells[i].dy + rise;
      if (dx !== 0 || dy !== 0) {
        const now = eased(offset);
        Object.assign(offset, { x: now.x + dx, y: now.y + dy, left: VIEW.easeTicks });
      }
      offset.left = Math.max(0, offset.left - 1);
    });
    this.cells = cells;
  }

  /** Where each half is drawn: [pivot, other]. */
  positions() {
    return this.cells.map(({ col, dy }, i) => {
      const offset = eased(this.offsets[i]);
      return { x: col + offset.x, y: this.fallY + dy + offset.y };
    });
  }
}

/** The pivot's row with its progress to the next one. A grounded pair keeps progress it can't use. */
function targetY({ grid, pair }) {
  return pair.row + (isGrounded(grid, pair) ? 0 : pair.progress / RULES.rowUnits);
}

/** Each half's column, and its row relative to the pivot. */
function relativeCells(pair) {
  const other = otherCell(pair);
  return [
    { col: pair.col, dy: 0 },
    { col: other.col, dy: other.row - pair.row },
  ];
}

/** What's left of an offset. @param {{x: number, y: number, left: number}} offset */
export function eased({ x, y, left }) {
  const share = left > 0 ? left / VIEW.easeTicks : 0;
  return { x: x * share, y: y * share };
}
