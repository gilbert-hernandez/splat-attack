import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import Button from '../ui/Button.js';
import { addSceneLabel } from './sceneLabel.js';

// Launched by Match, which is paused underneath.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const { width, height } = DISPLAY;
    this.ready = false;
    this.left = false;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);
    this.add.text(width / 2, 160, 'PAUSED', { fontFamily: FLOW.fontFamily, fontSize: '40px' }).setOrigin(0.5);
    this.resumeButton = new Button(this, width / 2, 260, 'RESUME', () => this.resume());
    this.quitButton = new Button(this, width / 2, 330, 'QUIT', () => this.quit());
    addSceneLabel(this)?.setY(36);
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.ready) this.resume();
    });
    this.time.delayedCall(FLOW.pauseInputDelayMs, () => {
      this.ready = true;
    });
  }

  resume() {
    if (this.left) return;
    this.left = true;
    /** @type {any} */ (this.scene.get('Match')).closePause();
    this.scene.stop();
  }

  quit() {
    if (this.left) return;
    this.left = true;
    this.scene.stop('UI');
    this.scene.stop('Match');
    this.scene.start('Title');
  }
}
