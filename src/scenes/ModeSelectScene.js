import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import Button from '../ui/Button.js';
import { addSceneLabel } from './sceneLabel.js';

export default class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super('ModeSelect');
  }

  create() {
    const x = DISPLAY.width / 2;
    this.add.text(x, 140, 'CHOOSE A MODE', { fontFamily: FLOW.fontFamily, fontSize: '36px' }).setOrigin(0.5);
    const pick = (mode) => () => this.scene.start('Match', { mode });
    this.ladderButton = new Button(this, x, 240, FLOW.modes.ladder, pick('ladder'));
    this.endlessButton = new Button(this, x, 310, FLOW.modes.endless, pick('endless'));
    this.backButton = new Button(this, x, 420, 'BACK', () => this.scene.start('Title'));
    addSceneLabel(this);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
  }
}
