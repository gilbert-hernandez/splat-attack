// Globals the game sets on window. Type-only; nothing here ships in the bundle.
interface Window {
  /** The running Phaser.Game, set in dev builds only (src/main.js). Read by e2e tests. */
  __GAME__?: import('phaser').Game;
}

/** The version from package.json, injected at build time by vite.config.js `define`. */
declare const __APP_VERSION__: string;
/** The short git commit at Vite start, or '' when git isn't available. Injected by vite.config.js. */
declare const __APP_COMMIT__: string;
