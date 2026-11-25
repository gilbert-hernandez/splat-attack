import { COLORS } from '../assets/manifest.js';
import { BOARD, FLOW, RULES, VIEW } from '../config/index.js';
import BoardModel from './boardModel.js';
import SpritePool from './SpritePool.js';

const DEPTH = { fill: 0, ghost: 1, blobs: 2, bridges: 3, pair: 4, frame: 5, next: 6 };
const name = (color) => COLORS[color - 1].name;

/** Draws one board. Without a state it's an empty board. */
export default class BoardView {
  /**
   * @param {Phaser.Scene} scene
   * @param {{x: number, frameKey: string, preview?: boolean}} options x is the left of the cells
   */
  constructor(scene, { x, frameKey, preview = false }) {
    this.scene = scene;
    this.x = x;
    /** @type {BoardModel | null} */
    this.model = null;
    const { columns, rows, cell, y, frameBorder, fill } = BOARD;
    scene.add
      .rectangle(x, y, columns * cell, rows * cell, fill)
      .setOrigin(0)
      .setDepth(DEPTH.fill);
    scene.add
      .image(x - frameBorder, y - frameBorder, frameKey)
      .setOrigin(0)
      .setDepth(DEPTH.frame);
    this.pools = {
      ghost: new SpritePool(scene, { depth: DEPTH.ghost, alpha: VIEW.ghostAlpha }),
      blobs: new SpritePool(scene, { depth: DEPTH.blobs }),
      bridges: new SpritePool(scene, { depth: DEPTH.bridges, origin: 0.5 }),
      pair: new SpritePool(scene, { depth: DEPTH.pair }),
      next: new SpritePool(scene, { depth: DEPTH.next }),
    };
    this.nextX = x + columns * cell + frameBorder + VIEW.next.gap;
    if (preview) this.addNextBoxes();
  }

  addNextBoxes() {
    const placeholder = (this.scene.registry.get('placeholders') ?? []).includes('ui_next_box');
    for (let i = 0; i < RULES.nextPairs; i++) {
      const box = this.scene.add
        .image(this.nextX, BOARD.y + i * VIEW.next.spacing, 'ui_next_box')
        .setOrigin(0)
        .setDepth(DEPTH.frame);
      if (placeholder) box.setTint(FLOW.panelTint);
    }
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
    for (const { col, row, color } of model.drawGhost()) {
      pools.ghost.place(this.left(col), this.top(row), `blob_${name(color)}_idle`);
    }
    for (const blob of model.drawBlobs()) this.placeBlob(pools.blobs, blob);
    for (const { x, y, color, direction } of model.drawBridges()) {
      pools.bridges.place(this.left(x), this.top(y), `blob_${name(color)}_bridge_${direction}`);
    }
    for (const half of model.drawPair()) this.placeBlob(pools.pair, half);
    model.drawNext().forEach((pair, i) => this.placeNext(pair, i));
    for (const pool of Object.values(pools)) pool.end();
  }

  left(col) {
    return this.x + col * BOARD.cell;
  }

  top(row) {
    return BOARD.y + (row - RULES.hiddenRows) * BOARD.cell;
  }

  /** Draws a blob, cut off at the board's top edge. */
  placeBlob(pool, { color, anim, frame, x, y }) {
    const top = Math.round(this.top(y));
    const { cell } = BOARD;
    const cut = Math.max(0, BOARD.y - top);
    if (cut >= cell) return;
    const sprite = pool.place(this.left(x), top, `blob_${name(color)}_${anim}`, frame);
    if (cut > 0) sprite.setCrop(0, cut, cell, cell - cut);
    else sprite.setCrop();
  }

  /** A next pair in its box: the other half above the pivot, as it will spawn. */
  placeNext(pair, i) {
    const [pivot, other] = pair;
    const { boxWidth, boxHeight, spacing } = VIEW.next;
    const x = this.nextX + (boxWidth - BOARD.cell) / 2;
    const y = BOARD.y + i * spacing + boxHeight / 2;
    this.pools.next.place(x, y - BOARD.cell, `blob_${name(other)}_idle`);
    this.pools.next.place(x, y, `blob_${name(pivot)}_idle`);
  }
}
