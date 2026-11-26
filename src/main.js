import Phaser from 'phaser';
import { CONTROLS, DEBUG, DISPLAY, SCREENS } from './config/index.js';
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
import InputMode from './ui/inputMode.js';

const parent = document.getElementById('game').getBoundingClientRect();
/** @type {import('./layout/layout.js').Screen} */
const screen = screenFor(parent.width, parent.height) ?? { orientation: 'landscape', ...SCREENS.landscape };

/** @type {LayoutManager | null} */
let layout = null;
const switchKeys = [
  ...Object.keys(CONTROLS.keys),
  ...CONTROLS.menuKeys,
  ...(DEBUG.enabled ? Object.keys(DEBUG.keys) : []),
];
const coarse = window.matchMedia?.('(pointer: coarse)').matches;
const inputMode = new InputMode(coarse ? 'touch' : 'keyboard', switchKeys, (mode) => layout?.setMode(mode));
// Capture on the window, so the layout has changed before Phaser handles the event.
const watch = { capture: true, passive: true };
window.addEventListener('touchstart', (event) => inputMode.touchStart(event.touches.length), watch);
for (const type of ['touchend', 'touchcancel']) {
  window.addEventListener(type, (/** @type {TouchEvent} */ event) => inputMode.touchEnd(event.touches.length), watch);
}
window.addEventListener('pointerdown', (event) => event.pointerType === 'mouse' && inputMode.mousePress(), watch);
window.addEventListener('keydown', (event) => inputMode.key(event.code), watch);
window.addEventListener('blur', () => inputMode.blur(), watch);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: screen.width,
  height: screen.height,
  backgroundColor: DISPLAY.backgroundColor,
  pixelArt: true,
  // A dragging finger, both rotate buttons and the meter, plus one spare (a resting palm).
  input: { activePointers: 5 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  callbacks: {
    preBoot: (booting) => {
      layout = new LayoutManager(booting.scale, screen, inputMode.mode);
      booting.registry.set('layout', layout);
      booting.registry.set('inputMode', inputMode);
    },
  },
  // No physics: the board rules are a pure engine (SA-3).
  scene: [BootScene, PreloadScene, TitleScene, ModeSelectScene, MatchScene, UIScene, PauseScene, ResultScene],
});

if (import.meta.env.DEV) {
  window.__GAME__ = game; // read by browser tests
}
