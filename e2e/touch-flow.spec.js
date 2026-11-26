import { expect, test } from '@playwright/test';
import { advance, advanceToEnd, fingers, inputMode, openGame, toPage, waitForScene, waitFrames } from './support.js';

// The whole loop by touch alone. Only the end of each match is hurried, through the test hooks.
test.use({ hasTouch: true });

/** Taps a button stored on a scene (a menu Button, or a match button by name). */
async function tap(page, finger, sceneKey, name) {
  const at = await page.evaluate(
    ([k, n]) => {
      const scene = /** @type {any} */ (window.__GAME__.scene.getScene(k));
      const b = scene.buttons?.[n] ?? scene[n];
      return { x: b.x, y: b.y };
    },
    [sceneKey, name],
  );
  const { x, y } = await toPage(page, at.x, at.y);
  await finger.press(x, y);
  await finger.lift();
}

/** Ends the running match at once and waits until the result takes touches. */
async function finishMatch(page) {
  await page.evaluate(() => {
    /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.manual = true;
  });
  await advanceToEnd(page);
  await advance(page, 60, 0);
  await waitForScene(page, 'Result');
  await page.waitForFunction(() => /** @type {any} */ (window.__GAME__.scene.getScene('Result')).ready);
}

const seed = (page) =>
  page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.replay.seed);

for (const size of [
  { width: 375, height: 667 },
  { width: 844, height: 390 },
]) {
  for (const mode of ['ladder', 'endless']) {
    test(`${mode} by touch alone at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      const problems = await openGame(page);
      const finger = await fingers(page);
      expect(await inputMode(page)).toBe('touch');

      await tap(page, finger, 'Title', 'startButton');
      await waitForScene(page, 'ModeSelect');
      await waitFrames(page);
      await tap(page, finger, 'ModeSelect', `${mode}Button`);
      await waitForScene(page, 'UI');
      await waitFrames(page);
      expect(await page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).mode)).toBe(mode);

      await tap(page, finger, 'Match', 'pause');
      await page.waitForFunction(() => window.__GAME__.scene.getScene('Pause')?.ready);
      await tap(page, finger, 'Pause', 'resumeButton');
      await page.waitForFunction(() => window.__GAME__.scene.isActive('Match'));
      await waitFrames(page);

      const first = await seed(page);
      await finishMatch(page);
      await tap(page, finger, 'Result', 'againButton');
      await waitForScene(page, 'UI');
      await waitFrames(page);
      expect(await seed(page)).not.toBe(first);
      expect(
        await page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.state.score),
      ).toBe(0);

      await finishMatch(page);
      await tap(page, finger, 'Result', 'titleButton');
      await waitForScene(page, 'Title');
      expect(await inputMode(page)).toBe('touch');
      expect(problems).toEqual([]);
    });
  }
}
