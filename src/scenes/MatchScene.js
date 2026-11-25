import Phaser from 'phaser';
import { BOARD, DEBUG } from '../config/index.js';
import { COLORS } from '../assets/manifest.js';
import { addSceneLabel } from './sceneLabel.js';

// Stub match: placeholder blobs on the boards, proving the asset keys and layout. The real board
// engine arrives in SA-3 and its view in SA-5. Ladder shows two boards, Endless (solo) one.
export default class MatchScene extends Phaser.Scene {
  constructor() {
    super('Match');
  }

  /** @param {{mode?: string}} [data] */
  init(data) {
    this.mode = data?.mode === 'endless' ? 'endless' : 'ladder';
    this.elapsedMs = 0;
    this.pauseOpen = false;
  }

  create() {
    if (this.mode === 'endless') {
      this.drawBoard(BOARD.soloX, 'board_frame_player');
    } else {
      this.drawBoard(BOARD.playerX, 'board_frame_player');
      this.drawBoard(BOARD.rivalX, 'board_frame_rival');
    }
    addSceneLabel(this);
    this.scene.launch('UI');
    this.input.keyboard.on('keydown-ESC', () => this.openPause());
    if (DEBUG.enabled) this.input.keyboard.on('keydown-R', () => this.finish());
  }

  drawBoard(x, frameKey) {
    const { columns, rows, cell, y, frameBorder, fill } = BOARD;
    this.add.rectangle(x, y, columns * cell, rows * cell, fill).setOrigin(0);
    this.add.image(x - frameBorder, y - frameBorder, frameKey).setOrigin(0);
    for (let col = 0; col < columns; col++) {
      const color = COLORS[col % COLORS.length].name;
      const cellAt = (row) => /** @type {const} */ ([x + col * cell, y + row * cell]);
      this.add.sprite(...cellAt(rows - 1), `blob_${color}_idle`, 0).setOrigin(0);
      this.add.image(...cellAt(rows - 2), `stain_${color}`).setOrigin(0);
      if (col % 3 === 0) this.add.image(...cellAt(rows - 2), 'gunk_whole').setOrigin(0);
    }
  }

  update(_time, delta) {
    this.elapsedMs += delta;
  }

  openPause() {
    if (this.pauseOpen) return;
    this.pauseOpen = true;
    this.scene.pause();
    this.scene.launch('Pause');
  }

  /** Called by Pause once it is closing. */
  closePause() {
    this.pauseOpen = false;
    this.scene.resume();
  }

  finish() {
    this.scene.stop('UI');
    this.scene.start('Result', { mode: this.mode });
  }
}
