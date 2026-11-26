/**
 * How every button handles presses. Only one pointer owns a press, and only its release on the target
 * counts; a cancelled touch, a release elsewhere and `reset()` drop it. Hover comes from the mouse only,
 * so nothing stays highlighted after a tap.
 */
export default class PressRule {
  /**
   * @param {import('phaser').Scene} scene
   * @param {import('phaser').GameObjects.GameObject} target an interactive object
   * @param {object} handlers
   * @param {(pointer: import('phaser').Input.Pointer) => boolean} [handlers.accept] can refuse a press
   * @param {() => void} [handlers.onPress] a press began
   * @param {() => void} [handlers.onRelease] a press ended on the target
   * @param {() => void} [handlers.onChange] the look changed
   */
  constructor(scene, target, { accept = () => true, onPress = () => {}, onRelease = () => {}, onChange = () => {} }) {
    this.scene = scene;
    /** The pointer id that owns the press, or null. */
    this.owner = null;
    /** Whether the owner is over the target. */
    this.inside = false;
    /** Whether the mouse is over the target. */
    this.hover = false;
    this.onChange = onChange;

    const set = (changes) => {
      Object.assign(this, changes);
      onChange();
    };
    target.on('pointerover', (pointer) => {
      if (!pointer.wasTouch) set({ hover: true });
      if (pointer.id === this.owner) set({ inside: true });
    });
    target.on('pointerout', (pointer) => {
      if (!pointer.wasTouch) set({ hover: false });
      if (pointer.id === this.owner) set({ inside: false });
    });
    target.on('pointerdown', (pointer) => {
      if (this.owner !== null || !accept(pointer)) return;
      set({ owner: pointer.id, inside: true, hover: !pointer.wasTouch });
      onPress();
    });
    target.on('pointerup', (pointer) => {
      if (pointer.id !== this.owner) return;
      set({ owner: null, inside: false, hover: !pointer.wasTouch && this.hover });
      // Phaser reports a cancelled touch as a release.
      if (!pointer.wasCanceled) onRelease();
    });
    // A release anywhere else drops the press. The target's own pointerup runs first.
    this.drop = (pointer) => {
      if (pointer.id === this.owner) set({ owner: null, inside: false });
    };
    scene.input.on('pointerup', this.drop);
    scene.input.on('pointerupoutside', this.drop);
  }

  /** Whether to draw the target pressed. */
  get pressed() {
    return this.owner !== null && this.inside;
  }

  /** Drops a press in progress. */
  reset() {
    this.owner = null;
    this.inside = false;
    this.onChange();
  }

  destroy() {
    this.scene.input.off('pointerup', this.drop);
    this.scene.input.off('pointerupoutside', this.drop);
  }
}
