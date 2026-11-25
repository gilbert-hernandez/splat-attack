import Phaser from 'phaser';
import { FLOW } from '../config/index.js';

const KEY = 'ui_button';
const FRAMES = { normal: 0, hover: 1, pressed: 2 };

/** A menu button using the `ui_button` sheet. Acts when a press that began on it is released on it. */
export default class Button extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x center x
   * @param {number} y center y
   * @param {string} label
   * @param {() => void} onClick
   */
  constructor(scene, x, y, label, onClick) {
    super(scene, x, y);
    this.armed = false;
    this.over = false;
    this.placeholder = (scene.registry.get('placeholders') ?? []).includes(KEY);
    this.image = scene.add.sprite(0, 0, KEY, FRAMES.normal);
    this.label = scene.add
      .text(0, 0, label, { fontFamily: FLOW.fontFamily, fontSize: '18px', color: FLOW.textColor, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add([this.image, this.label]);
    scene.add.existing(this);

    const set = (changes) => {
      Object.assign(this, changes);
      this.refresh();
    };
    this.image.setInteractive({ useHandCursor: true });
    this.image.on('pointerover', () => set({ over: true }));
    this.image.on('pointerout', () => set({ over: false }));
    this.image.on('pointerdown', () => set({ armed: true }));
    this.image.on('pointerup', () => {
      const act = this.armed;
      set({ armed: false });
      if (act) onClick();
    });
    // A release anywhere else cancels the press. The button's own pointerup runs first.
    const disarm = () => this.armed && set({ armed: false });
    scene.input.on('pointerup', disarm);
    scene.input.on('pointerupoutside', disarm);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off('pointerup', disarm);
      scene.input.off('pointerupoutside', disarm);
    });
    this.refresh();
  }

  refresh() {
    const state = this.over ? (this.armed ? 'pressed' : 'hover') : 'normal';
    this.image.setFrame(FRAMES[state]);
    if (this.placeholder) this.image.setTint(FLOW.buttonTints[state]);
  }
}
