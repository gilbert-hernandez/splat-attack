import { DEBUG } from '../config/index.js';

/** In debug mode, show the scene's key in the top-left corner so the flow is easy to follow. */
export function addSceneLabel(scene) {
  if (!DEBUG.enabled) return null;
  return scene.add
    .text(4, 4, `[${scene.scene.key}]`, { fontFamily: 'monospace', fontSize: '12px', color: '#888888' })
    .setScrollFactor(0)
    .setDepth(10000);
}
