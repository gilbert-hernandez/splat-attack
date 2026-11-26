import { expect, test } from '@playwright/test';
import { openGame, startMatch, waitForScene } from './support.js';

test.use({ hasTouch: true, isMobile: true });

/** Sets the device's safe-area insets (notch, home bar) before the game opens. */
async function insets(page, values) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { top: 0, right: 0, bottom: 0, left: 0, ...values },
  });
}

const canvasBox = (page) => page.locator('#game canvas').boundingBox();
const gameSize = (page) =>
  page.evaluate(() => ({ width: window.__GAME__.scale.gameSize.width, height: window.__GAME__.scale.gameSize.height }));

/** Expects a box to lie inside (left, top)–(right, bottom), allowing a rounding pixel. */
function expectInside(box, { left, top, right, bottom }) {
  expect(box.x).toBeGreaterThanOrEqual(left - 0.5);
  expect(box.y).toBeGreaterThanOrEqual(top - 0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(right + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(bottom + 0.5);
}

test('a notch and home bar in portrait cover nothing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await insets(page, { top: 47, bottom: 34 });
  const problems = await openGame(page);
  // The shape comes from 390×763: 360 × floor(360 × 763 / 390 / 2) × 2.
  expect(await gameSize(page)).toEqual({ width: 360, height: 704 });
  expectInside(await canvasBox(page), { left: 0, top: 47, right: 390, bottom: 810 });

  // The match's buttons too.
  await startMatch(page, 'endless');
  await waitForScene(page, 'UI');
  expectInside(await canvasBox(page), { left: 0, top: 47, right: 390, bottom: 810 });
  expect(problems).toEqual([]);
});

test('a notch in landscape covers nothing', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await insets(page, { left: 47, right: 47 });
  const problems = await openGame(page);
  expect(await gameSize(page)).toEqual({ width: 960, height: 540 });
  const box = await canvasBox(page);
  expectInside(box, { left: 47, top: 0, right: 797, bottom: 390 });
  // Still the largest fit: the height is the limit.
  expect(box.height).toBeCloseTo(390, 0);
  expect(problems).toEqual([]);
});

test('no insets leave the canvas as before', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await insets(page, {});
  const problems = await openGame(page);
  expect(await gameSize(page)).toEqual({ width: 360, height: 778 });
  const box = await canvasBox(page);
  // The width is the limit; the height is 778 × 390 / 360, centered.
  expect(box.width).toBeCloseTo(390, 0);
  // Phaser rounds the centering margin.
  expect(Math.abs(box.y - (844 - box.height) / 2)).toBeLessThan(1);
  expect(problems).toEqual([]);
});
