/** Sprites reused from one drawing to the next. Call begin(), place() each sprite, then end(). */
export default class SpritePool {
  /**
   * @param {Phaser.Scene} scene
   * @param {{depth: number, alpha?: number, origin?: number}} options
   */
  constructor(scene, { depth, alpha = 1, origin = 0 }) {
    this.scene = scene;
    this.options = { depth, alpha, origin };
    /** @type {Phaser.GameObjects.Sprite[]} */
    this.sprites = [];
    this.used = 0;
  }

  begin() {
    this.used = 0;
  }

  place(x, y, key, frame = 0) {
    let sprite = this.sprites[this.used];
    if (!sprite) {
      const { depth, alpha, origin } = this.options;
      sprite = this.scene.add.sprite(0, 0, key, frame).setOrigin(origin).setDepth(depth).setAlpha(alpha);
      this.sprites.push(sprite);
    }
    this.used++;
    return sprite.setTexture(key, frame).setPosition(Math.round(x), Math.round(y)).setVisible(true);
  }

  end() {
    for (let i = this.used; i < this.sprites.length; i++) this.sprites[i].setVisible(false);
  }

  /** The sprites in the current drawing. */
  active() {
    return this.sprites.slice(0, this.used);
  }
}
