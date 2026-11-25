// Shared browser-test helpers. Wait on game state, never on wall-clock time.

/** Keep window focus changes from reaching Phaser (a focus loss will open Pause from SA-13). */
export function ignoreWindowBlur(page) {
  return page.addInitScript(() => {
    window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true);
  });
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
