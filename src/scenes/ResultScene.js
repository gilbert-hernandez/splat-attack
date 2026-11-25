import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import Button from '../ui/Button.js';
import { addSceneLabel } from './sceneLabel.js';

// Result stub: the score breakdown arrives in SA-6 and SA-13.
export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  /** @param {{mode?: string}} [data] */
  init(data) {
    this.mode = data?.mode ?? 'ladder';
  }

  create() {
    const x = DISPLAY.width / 2;
    const panel = this.add.image(x, DISPLAY.height / 2, 'ui_result_panel');
    if ((this.registry.get('placeholders') ?? []).includes('ui_result_panel')) panel.setTint(FLOW.panelTint);
    this.add.text(x, 170, 'RESULT', { fontFamily: FLOW.fontFamily, fontSize: '40px' }).setOrigin(0.5);
    this.add
      .text(x, 230, `${FLOW.modes[this.mode]}  SCORE 0`, { fontFamily: FLOW.fontFamily, fontSize: '22px' })
      .setOrigin(0.5);
    this.titleButton = new Button(this, x, 350, 'TITLE', () => this.scene.start('Title'));
    addSceneLabel(this);
  }
}
