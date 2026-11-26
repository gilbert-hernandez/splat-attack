import { expect, test } from '@playwright/test';
import {
  advance,
  advanceToEnd,
  clickButton,
  fingers,
  openGame,
  startStopped,
  toPage,
  waitForScene,
  waitFrames,
} from './support.js';

test.use({ hasTouch: true, viewport: { width: 375, height: 667 } });

/** Where a scene's button is on the page, and how it looks. */
async function button(page, sceneKey, name) {
  const { x, y } = await page.evaluate(
    ([k, n]) => {
      const b = /** @type {any} */ (window.__GAME__.scene.getScene(k))[n];
      return { x: b.x, y: b.y };
    },
    [sceneKey, name],
  );
  return toPage(page, x, y);
}
const look = (page, sceneKey, name) =>
  page.evaluate(
    ([k, n]) => {
      const b = /** @type {any} */ (window.__GAME__.scene.getScene(k))[n];
      return { look: b.look, armed: b.armed };
    },
    [sceneKey, name],
  );
const NORMAL = { look: 'normal', armed: false };
const onTitle = (page) => page.evaluate(() => window.__GAME__.scene.isActive('Title'));

test('a cancelled touch on a menu button does nothing', async ({ page }) => {
  await openGame(page);
  const finger = await fingers(page);
  const start = await button(page, 'Title', 'startButton');
  await finger.press(start.x, start.y);
  expect(await look(page, 'Title', 'startButton')).toEqual({ look: 'pressed', armed: true });
  await finger.cancel();
  await waitFrames(page);
  expect(await onTitle(page)).toBe(true);
  expect(await look(page, 'Title', 'startButton')).toEqual(NORMAL);
});

test('only the finger that pressed a button can release it', async ({ page }) => {
  await openGame(page);
  const finger = await fingers(page);
  const start = await button(page, 'Title', 'startButton');
  await finger.press(start.x, start.y, 0);
  await finger.press(start.x, start.y + 200, 1);
  await finger.drag(0, -200, { id: 1 });
  await finger.liftOne(1);
  await waitFrames(page);
  expect(await onTitle(page)).toBe(true);
  expect(await look(page, 'Title', 'startButton')).toEqual({ look: 'pressed', armed: true });
  await finger.lift();
  await waitForScene(page, 'ModeSelect');
});

test('a finger pressed elsewhere and lifted on a button does nothing', async ({ page }) => {
  await openGame(page);
  const finger = await fingers(page);
  const start = await button(page, 'Title', 'startButton');
  await finger.press(start.x, start.y + 200);
  await finger.drag(0, -200);
  await finger.lift();
  await waitFrames(page);
  expect(await onTitle(page)).toBe(true);
});

test('sliding off a button drops the press and leaves it normal', async ({ page }) => {
  await openGame(page);
  const finger = await fingers(page);
  const start = await button(page, 'Title', 'startButton');
  await finger.press(start.x, start.y);
  await finger.drag(0, 150);
  expect((await look(page, 'Title', 'startButton')).look).toBe('normal');
  await finger.drag(0, -150);
  expect((await look(page, 'Title', 'startButton')).look).toBe('pressed');
  await finger.drag(0, 150);
  await finger.lift();
  await waitFrames(page);
  expect(await onTitle(page)).toBe(true);
  expect(await look(page, 'Title', 'startButton')).toEqual(NORMAL);
});

test('a tapped button never looks hovered', async ({ page }) => {
  await openGame(page);
  const finger = await fingers(page);
  const start = await button(page, 'Title', 'startButton');
  await finger.press(start.x, start.y);
  await finger.lift();
  await waitForScene(page, 'ModeSelect');
  await waitFrames(page);
  // Back to the title by touch: the new Start button and Back, tapped before, look normal.
  const back = await button(page, 'ModeSelect', 'backButton');
  await finger.press(back.x, back.y);
  await finger.drag(0, 2);
  expect((await look(page, 'ModeSelect', 'backButton')).look).toBe('pressed');
  await finger.lift();
  await waitForScene(page, 'Title');
  await waitFrames(page);
  expect(await look(page, 'Title', 'startButton')).toEqual(NORMAL);
});

/** Plays a stopped Endless match to its result, with a finger held down from the match if given. */
async function toResult(page, finger = null) {
  await startStopped(page, 'endless');
  await advanceToEnd(page);
  if (finger) await finger.press(20, 100);
  await advance(page, 60, 0);
  await waitForScene(page, 'Result');
  await waitFrames(page);
}
const onResult = (page) => page.evaluate(() => window.__GAME__.scene.isActive('Result'));

test('the result ignores taps until its delay ends, but not the mouse', async ({ page }) => {
  await openGame(page);
  const finger = await fingers(page);
  await toResult(page);
  await page.waitForFunction(() => /** @type {any} */ (window.__GAME__.scene.getScene('Result')).ready);
  // As if the delay were still running.
  await page.evaluate(() => {
    /** @type {any} */ (window.__GAME__.scene.getScene('Result')).ready = false;
  });
  const title = await button(page, 'Result', 'titleButton');
  await finger.press(title.x, title.y);
  expect(await look(page, 'Result', 'titleButton')).toEqual(NORMAL);
  await finger.lift();
  await waitFrames(page);
  expect(await onResult(page)).toBe(true);

  await clickButton(page, 'Result', 'againButton');
  await waitForScene(page, 'UI');
});

test('a finger held from the match does nothing on the result; a tap after the delay does', async ({ page }) => {
  await openGame(page);
  const finger = await fingers(page);
  await toResult(page, finger);
  await page.waitForFunction(() => /** @type {any} */ (window.__GAME__.scene.getScene('Result')).ready);
  const title = await button(page, 'Result', 'titleButton');
  await finger.drag(title.x - 20, title.y - 100);
  await finger.lift();
  await waitFrames(page);
  expect(await onResult(page)).toBe(true);
  await finger.press(title.x, title.y);
  await finger.lift();
  await waitForScene(page, 'Title');
});
