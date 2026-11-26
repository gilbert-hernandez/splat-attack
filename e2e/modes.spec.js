import { expect, test } from '@playwright/test';
import { FLOW } from '../src/config/flow.js';
import { fingers, inputMode, openGame, waitFrames } from './support.js';

const hint = (page) => page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Title')).hintText.text);

test('a desktop starts in keyboard mode', async ({ page }) => {
  await openGame(page);
  expect(await inputMode(page)).toBe('keyboard');
  expect(await hint(page)).toBe(FLOW.hints.keyboard);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('starts in touch mode', async ({ page }) => {
    const problems = await openGame(page);
    expect(await inputMode(page)).toBe('touch');
    expect(await hint(page)).toBe(FLOW.hints.touch);
    expect(problems).toEqual([]);
  });
});

test.describe('switching', () => {
  // A touch screen alone makes Chromium report a coarse pointer, so these start in touch mode.
  test.use({ hasTouch: true });

  test('touch, mouse and game keys switch the mode and the title hint; other keys do not', async ({ page }) => {
    await openGame(page);
    const finger = await fingers(page);
    const expectMode = async (mode) => {
      expect(await inputMode(page)).toBe(mode);
      expect(await hint(page)).toBe(FLOW.hints[mode]);
    };
    await expectMode('touch');
    await page.mouse.click(20, 20);
    await waitFrames(page, 2);
    await expectMode('keyboard');
    await finger.press(20, 20);
    await finger.lift();
    await expectMode('touch');
    await page.mouse.click(20, 20);
    await waitFrames(page, 2);
    await expectMode('keyboard');

    await finger.press(20, 20);
    await finger.lift();
    for (const key of ['Shift', 'F5', 'AudioVolumeUp', 'KeyK']) await page.keyboard.press(key);
    await waitFrames(page, 2);
    await expectMode('touch');
    await page.keyboard.press('KeyA');
    await waitFrames(page, 2);
    await expectMode('keyboard');
  });

  test('a key or mouse press with a finger down keeps touch mode', async ({ page }) => {
    await openGame(page);
    const finger = await fingers(page);
    await page.mouse.click(20, 20);
    await finger.press(20, 20);
    await page.keyboard.press('KeyA');
    await page.mouse.click(30, 30);
    await waitFrames(page, 2);
    expect(await inputMode(page)).toBe('touch');
    await finger.lift();
    await page.keyboard.press('Escape');
    await waitFrames(page, 2);
    expect(await inputMode(page)).toBe('keyboard');
  });
});
