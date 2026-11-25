import Phaser from 'phaser';

// First scene: nothing to load yet, just hand off to Preload.
// (Scaling is configured in main.js from src/config.)
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Preload');
  }
}
