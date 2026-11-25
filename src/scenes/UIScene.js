import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import { levelAt } from '../core/level.js';
import { onLayout, placeText } from '../layout/manager.js';
import { addSceneLabel } from './sceneLabel.js';

// HUD overlay on top of Match (the real HUD is SA-13).
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    const { mode } = /** @type {any} */ (this.scene.get('Match'));
    const style = { fontFamily: FLOW.fontFamily, fontSize: '20px', color: FLOW.textColor };
    this.modeText = this.add.text(0, 0, FLOW.modes[mode], style).setOrigin(0.5);
    this.scoreText = this.add.text(0, 0, '', style).setOrigin(0.5);
    this.levelText = this.add.text(0, 0, '', style).setOrigin(0.5);
    onLayout(this, ({ ui }) => {
      placeText(this.modeText, ui.mode);
      placeText(this.scoreText, ui.score);
      placeText(this.levelText, ui.level);
    });
    addSceneLabel(this)?.setY(20);
    this.update();
  }

  // Match updates first, so this shows its latest tick. setText skips unchanged text.
  update() {
    const { state } = /** @type {any} */ (this.scene.get('Match')).runner;
    this.scoreText.setText(`SCORE ${state.score}`);
    this.levelText.setText(`LEVEL ${levelAt(state.pairs)}`);
  }
}
