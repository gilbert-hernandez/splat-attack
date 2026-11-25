import Phaser from 'phaser';
import { DISPLAY, SCREENS } from './config/index.js';
import { screenFor } from './layout/layout.js';
import LayoutManager from './layout/manager.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import TitleScene from './scenes/TitleScene.js';
import ModeSelectScene from './scenes/ModeSelectScene.js';
import MatchScene from './scenes/MatchScene.js';
import UIScene from './scenes/UIScene.js';
import PauseScene from './scenes/PauseScene.js';
import ResultScene from './scenes/ResultScene.js';

const parent = document.getElementById('game').getBoundingClientRect();
/** @type {import('./layout/layout.js').Screen} */
const screen = screenFor(parent.width, parent.height) ?? { orientation: 'landscape', ...SCREENS.landscape };

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: screen.width,
  height: screen.height,
  backgroundColor: DISPLAY.backgroundColor,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  callbacks: {
    preBoot: (booting) => booting.registry.set('layout', new LayoutManager(booting.scale, screen)),
  },
  // No physics: the board rules are a pure engine (SA-3).
  scene: [BootScene, PreloadScene, TitleScene, ModeSelectScene, MatchScene, UIScene, PauseScene, ResultScene],
});

if (import.meta.env.DEV) {
  window.__GAME__ = game; // read by browser tests
}
