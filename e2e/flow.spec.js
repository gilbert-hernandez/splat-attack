import { expect, test } from '@playwright/test';
import { clickButton, openGame, openPause, startMatch, waitForScene, waitFrames } from './support.js';

const isActive = (page, key) => page.evaluate((k) => window.__GAME__.scene.isActive(k), key);
const elapsed = (page) => page.evaluate(() => window.__GAME__.scene.getScene('Match').elapsedMs);

test('boots to the title with no errors', async ({ page }) => {
  const problems = await openGame(page);
  await expect(page.locator('#game canvas')).toBeVisible();
  expect(problems).toEqual([]);
});

test('the Start button opens mode select, and Back and Esc return', async ({ page }) => {
  await openGame(page);
  await clickButton(page, 'Title', 'startButton');
  await waitForScene(page, 'ModeSelect');
  await waitFrames(page);
  await clickButton(page, 'ModeSelect', 'backButton');
  await waitForScene(page, 'Title');
  await waitFrames(page);
  await page.keyboard.press('Space');
  await waitForScene(page, 'ModeSelect');
  await waitFrames(page);
  await page.keyboard.press('Escape');
  await waitForScene(page, 'Title');
});

for (const mode of ['ladder', 'endless']) {
  test(`${mode}: match, pause, resume, result, title`, async ({ page }) => {
    const problems = await openGame(page);
    await startMatch(page, mode);
    const match = await page.evaluate(() => {
      const { scene } = window.__GAME__;
      return {
        mode: /** @type {any} */ (scene.getScene('Match')).mode,
        uiOnTop: scene.getIndex('UI') > scene.getIndex('Match'),
        label: /** @type {any} */ (scene.getScene('UI')).modeText.text,
      };
    });
    expect(match).toEqual({ mode, uiOnTop: true, label: mode.toUpperCase() });

    await openPause(page);
    const before = await elapsed(page);
    await waitFrames(page, 20);
    expect(await elapsed(page)).toBe(before);

    if (mode === 'ladder') await page.keyboard.press('Escape');
    else await clickButton(page, 'Pause', 'resumeButton');
    await page.waitForFunction((t) => window.__GAME__.scene.getScene('Match').elapsedMs > t, before);
    await waitFrames(page);
    expect(await isActive(page, 'Pause')).toBe(false);

    await page.keyboard.press('r');
    await waitForScene(page, 'Result');
    await waitFrames(page);
    expect(await isActive(page, 'UI')).toBe(false);
    await clickButton(page, 'Result', 'titleButton');
    await waitForScene(page, 'Title');
    expect(problems).toEqual([]);
  });
}

test('Quit from Pause stops the match and HUD, and a new match starts clean', async ({ page }) => {
  await openGame(page);
  await startMatch(page, 'ladder');
  await openPause(page);
  await clickButton(page, 'Pause', 'quitButton');
  await waitForScene(page, 'Title');
  await waitFrames(page);
  const running = await page.evaluate(() =>
    ['Match', 'UI', 'Pause'].filter((k) => window.__GAME__.scene.isActive(k) || window.__GAME__.scene.isPaused(k)),
  );
  expect(running).toEqual([]);

  await startMatch(page, 'endless');
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Match').mode)).toBe('endless');
  await openPause(page);
});
