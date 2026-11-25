import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import Button from '../ui/Button.js';
import { versionLabel } from '../util/version.js';
import { addSceneLabel } from './sceneLabel.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = DISPLAY;
    const placeholders = this.registry.get('placeholders') ?? [];
    const style = { fontFamily: FLOW.fontFamily, fontSize: '14px', color: FLOW.mutedColor };

    if (!placeholders.includes('ui_title_bg')) this.add.image(0, 0, 'ui_title_bg').setOrigin(0);
    if (placeholders.includes('ui_logo')) {
      this.add.text(width / 2, 170, 'SPLAT ATTACK', { ...style, fontSize: '72px', color: '#f0abfc' }).setOrigin(0.5);
    } else {
      this.add.image(width / 2, 170, 'ui_logo');
    }
    this.startButton = new Button(this, width / 2, 330, 'START', () => this.start());
    this.add.text(width / 2, 460, FLOW.hint, style).setOrigin(0.5);
    this.versionText = this.add
      .text(8, height - 8, versionLabel(__APP_VERSION__, __APP_COMMIT__, import.meta.env.DEV), style)
      .setOrigin(0, 1);
    addSceneLabel(this);
    this.input.keyboard.on('keydown-ENTER', () => this.start());
    this.input.keyboard.on('keydown-SPACE', () => this.start());
  }

  start() {
    this.scene.start('ModeSelect');
  }
}
