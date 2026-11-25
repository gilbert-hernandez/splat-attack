import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import { formatTime } from '../match/stats.js';
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
    const x = DISPLAY.width / 2;
    const { score, level, pairs, longestChain, ticks } = this.stats;
    const text = (y, size, value) =>
      this.add.text(x, y, value, { fontFamily: FLOW.fontFamily, fontSize: `${size}px` }).setOrigin(0.5);
    const panel = this.add.image(x, DISPLAY.height / 2, 'ui_result_panel');
    if ((this.registry.get('placeholders') ?? []).includes('ui_result_panel')) panel.setTint(FLOW.panelTint);
    text(150, 36, 'RESULT');
    text(188, 18, FLOW.modes[this.mode]);
    this.scoreText = text(222, 28, `SCORE ${score}`);
    const rows = [`LEVEL ${level}`, `PAIRS ${pairs}`, `LONGEST CHAIN ${longestChain}`, `TIME ${formatTime(ticks)}`];
    this.statTexts = rows.map((row, i) => text(254 + i * 22, 16, row));
    this.againButton = new Button(this, x - 90, 372, 'PLAY AGAIN', () => this.playAgain());
    this.titleButton = new Button(this, x + 90, 372, 'TITLE', () => this.toTitle());
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
