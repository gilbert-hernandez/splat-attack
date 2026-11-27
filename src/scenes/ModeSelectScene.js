import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import { onLayout, placeText } from '../layout/manager.js';
import Button from '../ui/Button.js';
import { addSceneLabel } from './sceneLabel.js';

export default class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super('ModeSelect');
  }

  create() {
    const heading = this.add
      .text(0, 0, 'CHOOSE A MODE', { fontFamily: FLOW.fontFamily, fontSize: '36px' })
      .setOrigin(0.5);
    // Ladder starts its climb at the first rival.
    const pick = (mode) => () => this.scene.start('Match', mode === 'ladder' ? { mode, rival: 1 } : { mode });
    this.ladderButton = new Button(this, FLOW.modes.ladder, pick('ladder'));
    this.endlessButton = new Button(this, FLOW.modes.endless, pick('endless'));
    this.backButton = new Button(this, 'BACK', () => this.scene.start('Title'));
    onLayout(this, ({ modeSelect }) => {
      placeText(heading, modeSelect.heading);
      this.ladderButton.place(modeSelect.ladder);
      this.endlessButton.place(modeSelect.endless);
      this.backButton.place(modeSelect.back);
    });
    addSceneLabel(this);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
  }
}
