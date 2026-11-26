import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import { onLayout, placeText } from '../layout/manager.js';
import Button from '../ui/Button.js';
import { versionLabel } from '../util/version.js';
import { addSceneLabel } from './sceneLabel.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  init() {
    this.background = null;
    this.logo = null;
  }

  create() {
    const style = { fontFamily: FLOW.fontFamily, fontSize: '14px', color: FLOW.mutedColor, align: 'center' };
    this.startButton = new Button(this, 'START', () => this.start());
    const hint = this.add.text(0, 0, '', style).setOrigin(0.5);
    this.versionText = this.add
      .text(0, 0, versionLabel(__APP_VERSION__, __APP_COMMIT__, import.meta.env.DEV), style)
      .setOrigin(0, 1);
    this.hintText = hint;
    onLayout(this, ({ title, mode }) => {
      this.placeArt(title);
      this.startButton.place(title.start);
      hint.setText(FLOW.hints[mode]);
      placeText(hint, title.hint);
      placeText(this.versionText, title.version);
    });
    addSceneLabel(this);
    this.input.keyboard.on('keydown-ENTER', () => this.start());
    this.input.keyboard.on('keydown-SPACE', () => this.start());
  }

  /** Each orientation has its own art, and either may be missing. */
  placeArt({ background, logo }) {
    const placeholders = this.registry.get('placeholders') ?? [];
    this.background?.destroy();
    this.background = placeholders.includes(background.key)
      ? null
      : this.add.image(background.x, background.y, background.key).setDepth(-1);
    this.logo?.destroy();
    this.logo = placeholders.includes(logo.key)
      ? this.add.text(logo.x, logo.y, 'SPLAT ATTACK', {
          fontFamily: FLOW.fontFamily,
          fontSize: `${logo.size}px`,
          color: '#f0abfc',
        })
      : this.add.image(logo.x, logo.y, logo.key);
    this.logo.setOrigin(0.5);
  }

  start() {
    this.scene.start('ModeSelect');
  }
}
