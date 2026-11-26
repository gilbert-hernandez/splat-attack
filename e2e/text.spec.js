import { expect, test } from '@playwright/test';
import { advance, advanceToEnd, openGame, startStopped, useTouch, waitForScene, waitFrames } from './support.js';

test.use({ hasTouch: true });

/**
 * The visible texts of the active scenes, with their size in CSS px and whether they are on screen.
 * Scene labels ("[Title]") are for developers and left out.
 */
const texts = (page) =>
  page.evaluate(() => {
    const game = window.__GAME__;
    const canvas = game.canvas.getBoundingClientRect();
    const scale = canvas.width / game.scale.gameSize.width;
    const { width, height } = game.scale.gameSize;
    const all = (objects) => objects.flatMap((/** @type {any} */ o) => (o.list ? (o.visible ? all(o.list) : []) : [o]));
    return game.scene
      .getScenes(false)
      .filter((s) => s.sys.isVisible() && (s.sys.isActive() || s.sys.isPaused()))
      .flatMap((s) => all(s.children.list).map((o) => ({ scene: s.scene.key, o })))
      .filter(({ o }) => o.type === 'Text' && o.visible && o.text && !o.text.startsWith('['))
      .map(({ scene, o }) => {
        const b = o.getBounds();
        return {
          scene,
          text: o.text.slice(0, 20),
          css: parseFloat(o.style.fontSize) * scale,
          onScreen: b.x >= 0 && b.y >= 0 && b.right <= width && b.bottom <= height,
        };
      });
  });

/** Fails unless every text is at least 12 CSS px and on screen. Returns the scenes seen. */
async function expectReadable(page) {
  const found = await texts(page);
  expect(found.length).toBeGreaterThan(0);
  for (const t of found) {
    expect(t.css, `${t.scene}: ${t.text}`).toBeGreaterThanOrEqual(12);
    expect(t.onScreen, `${t.scene}: ${t.text}`).toBe(true);
  }
  return new Set(found.map((t) => t.scene));
}

for (const size of [
  { width: 568, height: 320 },
  { width: 375, height: 553 },
]) {
  test(`every text is readable in touch mode at ${size.width}x${size.height}`, async ({ page }) => {
    // Every scene in turn.
    test.setTimeout(90000);
    await page.setViewportSize(size);
    const problems = await openGame(page);
    await useTouch(page);
    expect([...(await expectReadable(page))]).toEqual(['Title']);

    await page.evaluate(() => window.__GAME__.scene.getScene('Title').scene.start('ModeSelect'));
    await waitForScene(page, 'ModeSelect');
    await waitFrames(page);
    expect([...(await expectReadable(page))]).toEqual(['ModeSelect']);

    await page.evaluate(() => window.__GAME__.scene.getScene('ModeSelect').scene.start('Title'));
    await waitForScene(page, 'Title');
    await startStopped(page, 'endless');
    await useTouch(page);
    expect(await expectReadable(page)).toContain('UI');

    await page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).openPause());
    await waitForScene(page, 'Pause');
    await waitFrames(page);
    expect(await expectReadable(page)).toContain('Pause');

    await page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Pause')).resume());
    await page.waitForFunction(() => !window.__GAME__.scene.isActive('Pause'));
    await advanceToEnd(page);
    await advance(page, 100);
    await waitForScene(page, 'Result');
    await waitFrames(page);
    expect([...(await expectReadable(page))]).toEqual(['Result']);
    expect(problems).toEqual([]);
  });
}
