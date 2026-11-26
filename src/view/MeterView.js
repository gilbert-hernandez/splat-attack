import { RULES, VIEW } from '../config/index.js';

const FRAME = 'ui_meter_frame';
const FILL = 'ui_meter_fill';
const DEPTH = 7;

/**
 * How much of the fill to show, in fill-texture pixels.
 * @param {number} meter the engine's meter
 * @param {number} fillWidth the fill texture's width
 */
export function fillShown(meter, fillWidth) {
  return Math.floor((fillWidth * Math.max(0, Math.min(meter, RULES.meter.max))) / RULES.meter.max);
}

/** One board's meter: the frame, and the fill cropped to the meter, tinted while full. Scales to its rectangle. */
export default class MeterView {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.frame = scene.add.image(0, 0, FRAME).setOrigin(0).setDepth(DEPTH);
    this.fill = scene.add
      .image(0, 0, FILL)
      .setOrigin(0)
      .setDepth(DEPTH + 1);
    this.meter = -1;
  }

  /** @param {{x: number, y: number, width: number, height: number}} rect */
  place({ x, y, width, height }) {
    const sx = width / this.frame.width;
    const sy = height / this.frame.height;
    this.frame.setPosition(x, y).setScale(sx, sy);
    this.fill.setPosition(x + VIEW.meterInset * sx, y + VIEW.meterInset * sy).setScale(sx, sy);
  }

  /** @param {number} meter the engine's meter */
  show(meter) {
    if (meter === this.meter) return;
    this.meter = meter;
    this.fill.setCrop(0, 0, fillShown(meter, this.fill.width), this.fill.height);
    if (meter >= RULES.meter.max) this.fill.setTint(VIEW.meterFullTint);
    else this.fill.clearTint();
  }

  /** @param {boolean} visible */
  setVisible(visible) {
    this.frame.setVisible(visible);
    this.fill.setVisible(visible);
  }
}
