import { COLORS } from '../assets/manifest.js';
import { BOARD, FLOW, RULES, VIEW } from '../config/index.js';
import { bombArea } from '../core/meter.js';
import BoardModel from './boardModel.js';
import SpritePool from './SpritePool.js';

const DEPTH = { fill: 0, stains: 0.5, ghost: 1, blobs: 2, bridges: 3, target: 3.5, pair: 4, frame: 5, next: 6 };
const name = (color) => COLORS[color - 1].name;

/** Draws one board. Without a state it's an empty board. */
export default class BoardView {
  /**
   * @param {Phaser.Scene} scene
   * @param {{frameKey: string, preview?: boolean}} options
   */
  constructor(scene, { frameKey, preview = false }) {
    this.scene = scene;
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    /** @type {BoardModel | null} */
    this.model = null;
    const { columns, rows, cell, fill } = BOARD;
    this.fill = scene.add
      .rectangle(0, 0, columns * cell, rows * cell, fill)
      .setOrigin(0)
      .setDepth(DEPTH.fill);
    this.frame = scene.add.image(0, 0, frameKey).setOrigin(0).setDepth(DEPTH.frame);
    this.pools = {
      stains: new SpritePool(scene, { depth: DEPTH.stains, alpha: VIEW.stainAlpha }),
      ghost: new SpritePool(scene, { depth: DEPTH.ghost, alpha: VIEW.ghostAlpha }),
      blobs: new SpritePool(scene, { depth: DEPTH.blobs }),
      bridges: new SpritePool(scene, { depth: DEPTH.bridges, origin: 0.5 }),
      pair: new SpritePool(scene, { depth: DEPTH.pair }),
      next: new SpritePool(scene, { depth: DEPTH.next }),
    };
    this.next = { x: 0, y: 0, spacing: 0 };
    this.nextBoxes = preview ? this.addNextBoxes() : [];
    /** The Bomb target's outline, shown while the meter choice is open. */
    this.target = scene.add.graphics().setDepth(DEPTH.target);
    this.showTarget = false;
  }

  /**
   * Shows or hides the outline of where a Bomb would go off.
   * @param {boolean} shown
   */
  setTarget(shown) {
    if (shown === this.showTarget) return;
    this.showTarget = shown;
    this.draw();
  }

  /** Outlines the Bomb area, read from the engine, or clears it. */
  drawTarget() {
    this.target.clear();
    const area = this.showTarget && this.model ? bombArea(this.model.state) : null;
    if (!area) return;
    const cols = area.cells.map((c) => c.col);
    const rows = area.cells.map((c) => c.row);
    const left = Math.min(...cols);
    const top = Math.min(...rows);
    const size = BOARD.cell * this.scale;
    const { width, color, alpha } = VIEW.bombOutline;
    this.target
      .lineStyle(width, color, alpha)
      .strokeRect(
        this.left(left),
        this.top(top),
        (Math.max(...cols) - left + 1) * size,
        (Math.max(...rows) - top + 1) * size,
      );
  }

  addNextBoxes() {
    const placeholder = (this.scene.registry.get('placeholders') ?? []).includes('ui_next_box');
    return Array.from({ length: RULES.nextPairs }, () => {
      const box = this.scene.add.image(0, 0, 'ui_next_box').setOrigin(0).setDepth(DEPTH.frame);
      return placeholder ? box.setTint(FLOW.panelTint) : box;
    });
  }

  /**
   * Moves the board. (x, y) is the top-left of the cells; `next` places the next boxes.
   * @param {{x: number, y: number, scale: number, next?: {x: number, y: number, spacing: number}}} place
   */
  place({ x, y, scale, next }) {
    Object.assign(this, { x, y, scale });
    if (next) this.next = next;
    const border = BOARD.frameBorder * scale;
    this.fill.setPosition(x, y).setScale(scale);
    this.frame.setPosition(x - border, y - border).setScale(scale);
    this.nextBoxes.forEach((box, i) => box.setPosition(this.next.x, this.next.y + i * this.next.spacing));
    // The match may be paused, so nothing else would redraw it.
    this.draw();
  }

  /** Starts showing a match. @param {import('../core/engine.js').State} state */
  show(state) {
    this.model = new BoardModel(state);
    this.draw();
  }

  /**
   * @param {import('../core/engine.js').State} state
   * @param {import('../core/engine.js').Event[]} events
   */
  tick(state, events) {
    this.model.tick(state, events);
  }

  draw() {
    const { model, pools } = this;
    if (!model) return;
    for (const pool of Object.values(pools)) pool.begin();
    for (const { col, row, color } of model.drawStains()) {
      pools.stains.place(this.left(col), this.top(row), `stain_${name(color)}`, 0, this.scale);
    }
    for (const { col, row, color } of model.drawGhost()) {
      pools.ghost.place(this.left(col), this.top(row), `blob_${name(color)}_idle`, 0, this.scale);
    }
    for (const blob of model.drawBlobs()) this.placeBlob(pools.blobs, blob);
    for (const { x, y, color, direction } of model.drawBridges()) {
      pools.bridges.place(this.left(x), this.top(y), `blob_${name(color)}_bridge_${direction}`, 0, this.scale);
    }
    for (const half of model.drawPair()) this.placeBlob(pools.pair, half);
    if (this.nextBoxes.length > 0) model.drawNext().forEach((pair, i) => this.placeNext(pair, i));
    for (const pool of Object.values(pools)) pool.end();
    this.drawTarget();
  }

  left(col) {
    return this.x + col * BOARD.cell * this.scale;
  }

  top(row) {
    return this.y + (row - RULES.hiddenRows) * BOARD.cell * this.scale;
  }

  /** Draws a blob or gunk, cut off at the board's top edge. */
  placeBlob(pool, { key, frame, x, y }) {
    const { cell } = BOARD;
    const top = Math.round((y - RULES.hiddenRows) * cell);
    const cut = Math.max(0, -top);
    if (cut >= cell) return;
    const { scale } = this;
    const sprite = pool.place(this.left(x), this.y + top * scale, key, frame, scale);
    if (cut > 0) sprite.setCrop(0, cut, cell, cell - cut);
    else sprite.setCrop();
  }

  /** A next pair in its box: the other half above the pivot, as it will spawn. */
  placeNext(pair, i) {
    const [pivot, other] = pair;
    const { width, height } = VIEW.nextBox;
    const x = this.next.x + (width - BOARD.cell) / 2;
    const y = this.next.y + i * this.next.spacing + height / 2;
    this.pools.next.place(x, y - BOARD.cell, `blob_${name(other)}_idle`);
    this.pools.next.place(x, y, `blob_${name(pivot)}_idle`);
  }
}
