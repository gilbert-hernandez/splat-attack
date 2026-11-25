import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import { addSceneLabel } from './sceneLabel.js';

// HUD overlay on top of Match (the real HUD is SA-13).
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    const { mode } = /** @type {any} */ (this.scene.get('Match'));
    const x = DISPLAY.width / 2;
    const style = { fontFamily: FLOW.fontFamily, fontSize: '20px', color: FLOW.textColor };
    this.modeText = this.add.text(x, 20, FLOW.modes[mode], style).setOrigin(0.5);
    this.scoreText = this.add.text(x, 48, 'SCORE 0', style).setOrigin(0.5);
    addSceneLabel(this)?.setY(20);
  }
}
