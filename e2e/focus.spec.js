import { expect, test } from '@playwright/test';
import {
  advance,
  advanceToEnd,
  blurWindow,
  clickButton,
  fingers,
  holdKey,
  matchState,
  openGame,
  openPause,
  setHidden,
  startMatch,
  startStopped,
  waitForScene,
  waitFrames,
} from './support.js';

test.use({ hasTouch: true });

const isActive = (page, key) => page.evaluate((k) => window.__GAME__.scene.isActive(k), key);
const tick = async (page) => (await matchState(page)).tick;
const held = (page) =>
  page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).keys.held.slice());
const gestureKind = (page) =>
  page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).touch.press?.kind ?? null);

test('hiding the page mid-match pauses it, and showing it again keeps it paused', async ({ page }) => {
  const problems = await openGame(page);
  await startMatch(page, 'endless');
  await page.waitForFunction(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.state.tick > 10);

  await setHidden(page, true);
  await waitForScene(page, 'Pause');
  const at = await tick(page);
  await page.waitForTimeout(500);
  expect(await tick(page)).toBe(at);

  await setHidden(page, false);
  await waitFrames(page, 10);
  expect(await isActive(page, 'Pause')).toBe(true);
  expect(await tick(page)).toBe(at);

  // RESUME goes on from there.
  await clickButton(page, 'Pause', 'resumeButton');
  await page.waitForFunction(
    (t) => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.state.tick > t,
    at,
  );
  expect(problems).toEqual([]);
});

test('a window blur pauses and releases a held key and a held finger', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  const finger = await fingers(page);
  await holdKey(page, 'KeyA');
  await finger.press(187, 300);
  await finger.drag(0, 60);
  expect(await gestureKind(page)).toBe('drop');

  await blurWindow(page);
  await waitForScene(page, 'Pause');
  expect(await held(page)).toEqual([]);
  expect(await gestureKind(page)).toBe(null);

  // Nothing moves on its own after resuming with the key and the finger still down.
  await page.keyboard.up('KeyA');
  await finger.lift();
  await clickButton(page, 'Pause', 'resumeButton');
  await page.waitForFunction(() => !window.__GAME__.scene.isActive('Pause'));
  const { col, row } = (await matchState(page)).pair;
  await advance(page, 2);
  const after = (await matchState(page)).pair;
  expect(after.col).toBe(col);
  expect(after.row - row).toBeLessThanOrEqual(1);
  expect(problems).toEqual([]);
});

test('a blur while paused changes nothing', async ({ page }) => {
  const problems = await openGame(page);
  await startMatch(page, 'endless');
  await openPause(page);
  await blurWindow(page);
  await setHidden(page, true);
  await setHidden(page, false);
  await waitFrames(page);
  expect(await isActive(page, 'Pause')).toBe(true);
  expect(await page.evaluate(() => window.__GAME__.scene.isPaused('Match'))).toBe(true);
  // Still one Pause.
  expect(
    await page.evaluate(() => window.__GAME__.scene.getScenes(false).filter((s) => s.scene.key === 'Pause').length),
  ).toBe(1);
  // One RESUME is enough.
  await clickButton(page, 'Pause', 'resumeButton');
  await page.waitForFunction(() => !window.__GAME__.scene.isActive('Pause'));
  expect(await isActive(page, 'Match')).toBe(true);
  expect(problems).toEqual([]);
});

test('a blur during the game-over message pauses it', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  await advanceToEnd(page);
  expect((await matchState(page)).phase).toBe('over');
  await blurWindow(page);
  await waitForScene(page, 'Pause');
  expect(await isActive(page, 'Result')).toBe(false);
  expect(problems).toEqual([]);
});

test('hiding the page after the match has finished still reaches the result', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  await advanceToEnd(page);
  // Past the message: the match finishes and starts Result.
  await advance(page, 100);
  await waitForScene(page, 'Result');
  await setHidden(page, true);
  await blurWindow(page);
  await setHidden(page, false);
  await waitFrames(page);
  expect(await isActive(page, 'Result')).toBe(true);
  expect(await isActive(page, 'Pause')).toBe(false);
  expect(problems).toEqual([]);
});

test('a blur or hidden page in menus changes nothing', async ({ page }) => {
  const problems = await openGame(page);
  const away = async () => {
    await blurWindow(page);
    await setHidden(page, true);
    await setHidden(page, false);
    await waitFrames(page);
  };
  await away();
  expect(await isActive(page, 'Title')).toBe(true);
  await page.keyboard.press('Enter');
  await waitForScene(page, 'ModeSelect');
  await away();
  expect(await isActive(page, 'ModeSelect')).toBe(true);
  expect(await isActive(page, 'Pause')).toBe(false);
  expect(problems).toEqual([]);
});
