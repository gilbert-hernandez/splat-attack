import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import PressRule from './pressRule.js';

const KEY = 'ui_button';
const FRAMES = { normal: 0, hover: 1, pressed: 2 };

/**
 * A menu button using the `ui_button` sheet. Acts when a press that began on it is released on it by
 * the same pointer; a cancelled touch never acts. Only the mouse hovers.
 */
export default class Button extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} label
   * @param {() => void} onClick
   * @param {{accept?: (pointer: Phaser.Input.Pointer) => boolean}} [options] `accept` can refuse a press
   */
  constructor(scene, label, onClick, { accept = () => true } = {}) {
    super(scene, 0, 0);
    this.placeholder = (scene.registry.get('placeholders') ?? []).includes(KEY);
    this.image = scene.add.sprite(0, 0, KEY, FRAMES.normal);
    this.label = scene.add
      .text(0, 0, label, { fontFamily: FLOW.fontFamily, fontSize: '18px', color: FLOW.textColor, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add([this.image, this.label]);
    scene.add.existing(this);
    this.image.setInteractive({ useHandCursor: true });
    this.press = new PressRule(scene, this.image, {
      accept,
      onRelease: onClick,
      onChange: () => this.refresh(),
    });
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.press.destroy());
    this.refresh();
  }

  /** Moves the button's center, and sets its label size if given. A press in progress is cancelled. */
  place({ x, y, size = 0 }) {
    this.setPosition(x, y);
    if (size) this.label.setFontSize(size);
    this.press.reset();
  }

  /** Whether a press is in progress. */
  get armed() {
    return this.press.owner !== null;
  }

  /** 'normal', 'hover' or 'pressed'. */
  get look() {
    const { pressed, hover } = this.press;
    return pressed ? 'pressed' : hover ? 'hover' : 'normal';
  }

  refresh() {
    const state = this.look;
    this.image.setFrame(FRAMES[state]);
    if (this.placeholder) this.image.setTint(FLOW.buttonTints[state]);
  }
}
