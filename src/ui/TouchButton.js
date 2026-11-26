import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import PressRule from './pressRule.js';

const BUTTON = 'ui_touch_button';
const FRAMES = { normal: 0, pressed: 1 };

/**
 * An on-screen match button: an icon, on the touch button unless `bare`, with a tap target as large
 * as its layout rectangle. Touch only; the mouse doesn't press it.
 */
export default class TouchButton extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {'cw' | 'ccw' | 'pause' | 'meter'} name picks the icon `ui_touch_<name>`
   * @param {object} handlers
   * @param {() => void} [handlers.onPress] acts on press
   * @param {() => void} [handlers.onRelease] acts when the press lifts on it
   * @param {boolean} [bare] the icon alone, without the button
   */
  constructor(scene, name, { onPress, onRelease }, bare = false) {
    super(scene, 0, 0);
    const placeholders = scene.registry.get('placeholders') ?? [];
    this.placeholder = !bare && placeholders.includes(BUTTON);
    this.back = bare ? null : scene.add.sprite(0, 0, BUTTON, FRAMES.normal);
    const iconKey = `ui_touch_${name}`;
    this.icon = placeholders.includes(iconKey)
      ? scene.add
          .text(0, 0, FLOW.touchSymbols[name], {
            fontFamily: FLOW.fontFamily,
            fontSize: '32px',
            fontStyle: 'bold',
            color: FLOW.textColor,
          })
          .setOrigin(0.5)
      : scene.add.image(0, 0, iconKey);
    this.zone = scene.add.zone(0, 0, 1, 1).setInteractive();
    this.add([...(this.back ? [this.back] : []), this.icon, this.zone]);
    scene.add.existing(this);
    this.press = new PressRule(scene, this.zone, {
      accept: (pointer) => pointer.wasTouch,
      onPress,
      onRelease,
      onChange: () => this.refresh(),
    });
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.press.destroy());
    this.refresh();
  }

  /** Centers it in a layout rectangle, which becomes its tap target. A press in progress is dropped. */
  place({ x, y, width, height }) {
    this.setPosition(x + width / 2, y + height / 2);
    this.zone.setSize(width, height);
    /** @type {Phaser.Geom.Rectangle} */ (this.zone.input.hitArea).setTo(0, 0, width, height);
    this.press.reset();
  }

  /**
   * Shows or hides it. A shown button takes presses from the next frame, so the touch that showed it
   * can't press it.
   * @param {boolean} shown
   */
  show(shown) {
    this.setVisible(shown);
    this.zone.input.enabled = false;
    if (shown) this.scene.events.once(Phaser.Scenes.Events.UPDATE, () => (this.zone.input.enabled = this.visible));
  }

  /** 'normal' or 'pressed'. */
  get look() {
    return this.press.pressed ? 'pressed' : 'normal';
  }

  refresh() {
    const { look } = this;
    if (this.back) {
      this.back.setFrame(FRAMES[look]);
      if (this.placeholder) this.back.setTint(FLOW.touchTints[look]);
    } else {
      this.icon.setAlpha(look === 'pressed' ? FLOW.pressedAlpha : 1);
    }
  }
}
