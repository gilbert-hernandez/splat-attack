// Shared browser-test helpers. Wait on game state, never on wall-clock time.

/**
 * Keep the browser's own focus changes from reaching Phaser, since a focus loss opens Pause and a
 * headless page can lose focus at any time. Blurs a test sends itself (untrusted) still get through.
 */
export function ignoreWindowBlur(page) {
  return page.addInitScript(() => {
    window.addEventListener('blur', (e) => e.isTrusted && e.stopImmediatePropagation(), true);
  });
}

/** The window loses focus, as when another app comes to the front. */
export function blurWindow(page) {
  return page.evaluate(() => window.dispatchEvent(new FocusEvent('blur')));
}

/** The page is hidden or shown again, as when the app goes to the background and comes back. */
export function setHidden(page, hidden) {
  return page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

/** Wait until a scene is active. */
export function waitForScene(page, key) {
  return page.waitForFunction((k) => window.__GAME__?.scene.isActive(k), key);
}

/** Wait until the game loop has run `n` more frames. */
export async function waitFrames(page, n = 5) {
  const from = await page.evaluate(() => window.__GAME__.loop.frame);
  await page.waitForFunction((until) => window.__GAME__.loop.frame >= until, from + n);
}

/** Open the game and wait for Title. Returns the list that collects console and page errors. */
export async function openGame(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  await ignoreWindowBlur(page);
  await page.goto('/');
  await waitForScene(page, 'Title');
  await waitFrames(page);
  return problems;
}

/** Click a Button stored on a scene, through real mouse input. */
export async function clickButton(page, sceneKey, name) {
  const box = await page.locator('#game canvas').boundingBox();
  const at = await page.evaluate(
    ([k, n]) => {
      const button = window.__GAME__.scene.getScene(k)[n];
      return { x: button.x, y: button.y, width: window.__GAME__.scale.gameSize.width };
    },
    [sceneKey, name],
  );
  const scale = box.width / at.width;
  await page.mouse.move(box.x + at.x * scale, box.y + at.y * scale);
  await waitFrames(page, 2);
  await page.mouse.down();
  await waitFrames(page, 2);
  await page.mouse.up();
}

/** From Title, start a match in a mode ('ladder' or 'endless') with the HUD up. */
export async function startMatch(page, mode) {
  await page.keyboard.press('Enter');
  await waitForScene(page, 'ModeSelect');
  await waitFrames(page);
  await clickButton(page, 'ModeSelect', `${mode}Button`);
  await waitForScene(page, 'UI');
  await waitFrames(page);
}

/** Open Pause with Esc and wait until it accepts input. */
export async function openPause(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const { scene } = window.__GAME__;
    return scene.isActive('Pause') && scene.getScene('Pause').ready;
  });
}

/** Start a match on a seed with its clock stopped, so only advance() ticks it. */
export async function startStopped(page, mode, seed = 1) {
  await startMatch(page, mode);
  await page.evaluate((s) => {
    const match = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    match.begin(s);
    match.runner.manual = true;
  }, seed);
}

/** Run exactly `ticks` ticks now and draw. With a mask, the keyboard isn't read. */
export function advance(page, ticks, mask = undefined) {
  return page.evaluate(
    ([n, m]) => {
      const match = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
      match.runner.advance(n, m ?? undefined);
      // Both boards, so a read right after doesn't wait for the next frame to see the rival's.
      match.view.draw();
      match.rivalView?.draw();
    },
    [ticks, mask],
  );
}

/** Drop pairs straight down until the match ends, plus enough ticks for its animations. */
export function advanceToEnd(page) {
  return page.evaluate(() => {
    const { runner, view, rivalView } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    for (let i = 0; i < 5000 && !runner.over; i++) runner.advance(1, 16);
    runner.advance(40, 0);
    view.draw();
    rivalView?.draw();
  });
}

/** A copy of the match state. */
export function matchState(page) {
  return page.evaluate(() =>
    structuredClone(/** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.state),
  );
}

/** Change the stopped match's state (Object.assign) and show it. */
export function setState(page, changes) {
  return page.evaluate((c) => {
    const match = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    Object.assign(match.runner.state, c);
    match.view.show(match.runner.state);
  }, changes);
}

/** What a pool of a board shows: ghost, blobs, bridges, pair or next; the player's unless told. */
export function drawn(page, pool, board = 'view') {
  return page.evaluate(
    ([name, viewName]) => {
      const view = /** @type {any} */ (window.__GAME__.scene.getScene('Match'))[viewName];
      return view.pools[name].active().map((s) => ({
        key: s.texture.key,
        x: s.x,
        y: s.y,
        cut: s.isCropped ? s._crop.y : 0,
        visible: s.visible,
      }));
    },
    [pool, board],
  );
}

/** Hold a key down until the match has seen it. */
export async function holdKey(page, code) {
  await page.keyboard.down(code);
  await page.waitForFunction(
    (c) => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).keys.held.includes(c),
    code,
  );
}

/** Release a key and wait until the match has seen it. */
export async function releaseKey(page, code) {
  await page.keyboard.up(code);
  await page.waitForFunction(
    (c) => !(/** @type {any} */ (window.__GAME__.scene.getScene('Match')).keys.held.includes(c)),
    code,
  );
}

/** Fingers on the screen, in CSS pixels, sent through the browser's own touch input. */
export async function fingers(page) {
  const cdp = await page.context().newCDPSession(page);
  /** @type {Map<number, {x: number, y: number}>} */
  const down = new Map();
  const points = (ids = [...down.keys()]) => ids.map((id) => ({ id, ...down.get(id) }));
  const send = async (type, touchPoints) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await waitFrames(page, 3);
  };
  return {
    press: (x, y, id = 0) => {
      down.set(id, { x, y });
      return send('touchStart', points());
    },
    /** Moves a finger by some travel, through some points. */
    drag: async (dx, dy, { id = 0, steps = 4 } = {}) => {
      const from = down.get(id);
      for (let i = 1; i <= steps; i++) {
        down.set(id, { x: from.x + (dx * i) / steps, y: from.y + (dy * i) / steps });
        await send('touchMove', points());
      }
    },
    /** Lifts one finger, the others staying down. CDP releases the fingers a move leaves out. */
    liftOne: (id) => {
      down.delete(id);
      return down.size ? send('touchMove', points()) : send('touchEnd', []);
    },
    /** Lifts every finger. */
    lift: () => {
      down.clear();
      return send('touchEnd', []);
    },
    cancel: () => {
      down.clear();
      return send('touchCancel', []);
    },
  };
}

/** Page coordinates (CSS pixels) of a point in game pixels. */
export async function toPage(page, x, y) {
  const box = await page.locator('#game canvas').boundingBox();
  const width = await page.evaluate(() => window.__GAME__.scale.gameSize.width);
  const scale = box.width / width;
  return { x: box.x + x * scale, y: box.y + y * scale, scale };
}

/** Switch to touch mode without touching anything, as starting a match with keys leaves keyboard mode. */
export async function useTouch(page) {
  await page.evaluate(() => window.__GAME__.registry.get('inputMode').set('touch'));
  await waitFrames(page, 2);
}

/** The input mode: 'touch' or 'keyboard'. */
export function inputMode(page) {
  return page.evaluate(() => window.__GAME__.registry.get('layout').layout.mode);
}
