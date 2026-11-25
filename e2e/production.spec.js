import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// Runs against the production build. There's no game hook there by design, so it watches the text
// Phaser draws: every string passed to fillText is recorded per page.
test('production has no hook, no debug keys, and the plain version label', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(m.text()));
  await page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__texts = [];
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
      w.__texts.push(text);
      return /** @type {any} */ (draw).call(this, text, ...rest);
    };
  });
  const texts = () => page.evaluate(() => /** @type {any} */ (window).__texts.slice());
  await page.goto('/');
  await expect.poll(texts).toContain('START');
  expect(await page.evaluate(() => '__GAME__' in window)).toBe(false);
  expect(await texts()).toContain(`v${version}`);
  expect((await texts()).filter((t) => /-dev|^\[/.test(t))).toEqual([]);

  // Into an Endless match: Enter, then the ENDLESS button at its fixed place.
  await page.keyboard.press('Enter');
  await expect.poll(texts).toContain('ENDLESS');
  await expect
    .poll(async () => {
      await page.mouse.move(480, 310);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(100);
      return texts();
    })
    .toContain('SCORE 0');

  // No debug key acts: R would have opened Result by now in dev. Esc still opening Pause proves the key input works.
  for (const key of ['1', '2', 'b', 'f', 'p', '.', 'r']) await page.keyboard.press(key);
  await page.waitForTimeout(2500);
  expect((await texts()).filter((t) => /RESULT|twice/.test(t))).toEqual([]);
  await page.keyboard.press('Escape');
  await expect.poll(texts).toContain('PAUSED');
  expect(await texts()).not.toContain('RESULT');
  expect(problems.filter((p) => !/GPU stall|GL Driver/.test(p))).toEqual([]);
});
