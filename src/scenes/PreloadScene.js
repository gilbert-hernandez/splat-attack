import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import { onLayout, placeText } from '../layout/manager.js';
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
    const text = this.add.text(0, 0, 'Loading...', { fontFamily: FLOW.fontFamily, fontSize: '16px' }).setOrigin(0.5);
    const outline = this.add.graphics();
    const fill = this.add.graphics();
    let bar = { x: 0, y: 0, width: 0, height: 0 };
    let progress = 0;
    const draw = () => {
      fill
        .clear()
        .fillStyle(0xd946ef, 1)
        .fillRect(bar.x - bar.width / 2, bar.y, bar.width * progress, bar.height);
    };
    onLayout(this, ({ preload }) => {
      bar = preload.bar;
      const { x, y, width, height } = bar;
      placeText(text, { x, y: y - 24 });
      outline
        .clear()
        .lineStyle(2, 0xffffff, 1)
        .strokeRect(x - width / 2 - 2, y - 2, width + 4, height + 4);
      draw();
    });
    this.load.on('progress', (p) => {
      progress = p;
      draw();
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
