import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import { formatTime } from '../match/stats.js';
import { onLayout, placeText } from '../layout/manager.js';
import Button from '../ui/Button.js';
import { addSceneLabel } from './sceneLabel.js';

// How the match went. The score breakdown and personal bests arrive in SA-12 and SA-13.
export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  /** @param {{mode: string, stats: import('../match/stats.js').Stats}} data */
  init({ mode, stats }) {
    this.mode = mode;
    this.stats = stats;
    this.ready = false;
    this.left = false;
  }

  create() {
    const { score, level, pairs, longestChain, ticks } = this.stats;
    const text = (size, value) =>
      this.add.text(0, 0, value, { fontFamily: FLOW.fontFamily, fontSize: `${size}px` }).setOrigin(0.5);
    const placeholders = this.registry.get('placeholders') ?? [];
    const panel = this.add.image(0, 0, 'ui_result_panel');
    const heading = text(36, 'RESULT');
    const mode = text(18, FLOW.modes[this.mode]);
    this.scoreText = text(28, `SCORE ${score}`);
    const rows = [`LEVEL ${level}`, `PAIRS ${pairs}`, `LONGEST CHAIN ${longestChain}`, `TIME ${formatTime(ticks)}`];
    this.statTexts = rows.map((row) => text(16, row));
    // A finger still tapping from the match mustn't leave the result; a mouse click is deliberate.
    const options = { accept: (pointer) => this.ready || !pointer.wasTouch };
    this.againButton = new Button(this, 'PLAY AGAIN', () => this.playAgain(), options);
    this.titleButton = new Button(this, 'TITLE', () => this.toTitle(), options);
    onLayout(this, ({ result }) => {
      panel.setTexture(result.panel.key).setPosition(result.panel.x, result.panel.y).clearTint();
      if (placeholders.includes(result.panel.key)) panel.setTint(FLOW.panelTint);
      placeText(heading, result.heading);
      placeText(mode, result.mode);
      placeText(this.scoreText, result.score);
      const { x, y, spacing } = result.stats;
      this.statTexts.forEach((row, i) => placeText(row, { x, y: y + i * spacing }));
      this.againButton.place(result.again);
      this.titleButton.place(result.title);
    });
    addSceneLabel(this);

    this.time.delayedCall(FLOW.resultInputDelayMs, () => {
      this.ready = true;
    });
    const onPress = (act) => (event) => {
      if (this.ready && !event.repeat) act();
    };
    const { keyboard } = this.input;
    keyboard.on(
      'keydown-ENTER',
      onPress(() => this.playAgain()),
    );
    keyboard.on(
      'keydown-SPACE',
      onPress(() => this.playAgain()),
    );
    keyboard.on(
      'keydown-ESC',
      onPress(() => this.toTitle()),
    );
  }

  playAgain() {
    this.leave('Match', { mode: this.mode });
  }

  toTitle() {
    this.leave('Title');
  }

  leave(key, data = undefined) {
    if (this.left) return;
    this.left = true;
    this.scene.start(key, data);
  }
}
