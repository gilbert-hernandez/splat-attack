import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import { onLayout, placeText } from '../layout/manager.js';
import Button from '../ui/Button.js';
import { addSceneLabel } from './sceneLabel.js';

// Launched by Match, which is paused underneath.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    this.ready = false;
    this.left = false;
    const shade = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.7).setOrigin(0);
    const heading = this.add.text(0, 0, 'PAUSED', { fontFamily: FLOW.fontFamily, fontSize: '40px' }).setOrigin(0.5);
    this.resumeButton = new Button(this, 'RESUME', () => this.resume());
    this.quitButton = new Button(this, 'QUIT', () => this.quit());
    onLayout(this, ({ screen, pause }) => {
      shade.setSize(screen.width, screen.height);
      placeText(heading, pause.heading);
      this.resumeButton.place(pause.resume);
      this.quitButton.place(pause.quit);
    });
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
