import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import { MANIFEST } from '../assets/manifest.js';
import { AVAILABLE_FILES } from '../assets/available.js';
import { createPlaceholder } from '../assets/placeholders.js';
import { addSceneLabel } from './sceneLabel.js';

// Loads every manifest entry whose PNG exists and generates placeholders for the rest.
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    addSceneLabel(this);
    this.createProgressBar();
    for (const entry of MANIFEST) {
      const url = AVAILABLE_FILES[entry.file];
      if (!url) continue;
      const { frameWidth, frameHeight } = entry;
      if (entry.type === 'spritesheet') this.load.spritesheet(entry.key, url, { frameWidth, frameHeight });
      else this.load.image(entry.key, url);
    }
  }

  createProgressBar() {
    const [barW, barH] = [320, 16];
    const x = (DISPLAY.width - barW) / 2;
    const y = DISPLAY.height / 2;
    this.add
      .text(DISPLAY.width / 2, y - 24, 'Loading...', { fontFamily: FLOW.fontFamily, fontSize: '16px' })
      .setOrigin(0.5);
    this.add
      .graphics()
      .lineStyle(2, 0xffffff, 1)
      .strokeRect(x - 2, y - 2, barW + 4, barH + 4);
    const fill = this.add.graphics();
    this.load.on('progress', (p) => {
      fill
        .clear()
        .fillStyle(0xd946ef, 1)
        .fillRect(x, y, barW * p, barH);
    });
  }

  create() {
    const missing = MANIFEST.filter((entry) => !this.textures.exists(entry.key));
    for (const entry of missing) createPlaceholder(this, entry);
    const keys = missing.map((entry) => entry.key);
    // Scenes check this to style placeholders.
    this.registry.set('placeholders', keys);
    if (import.meta.env.DEV && keys.length > 0) {
      console.warn(`[assets] ${keys.length} placeholder(s) in use (art not delivered yet): ${keys.join(', ')}`);
    }
    this.scene.start('Title');
  }
}
