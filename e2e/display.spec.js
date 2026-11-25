import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openGame, waitFrames } from './support.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

for (const size of [
  { width: 1400, height: 600, game: [960, 540] },
  { width: 960, height: 540, game: [960, 540] },
  { width: 844, height: 390, game: [960, 540] },
  { width: 700, height: 900, game: [360, 640] },
  { width: 375, height: 667, game: [360, 640] },
  { width: 390, height: 844, game: [360, 778] },
]) {
  test(`fits and centers at ${size.width}x${size.height}, unsmoothed`, async ({ page }) => {
    await openGame(page);
    await page.setViewportSize({ width: size.width, height: size.height });
    const [gameWidth, gameHeight] = size.game;
    const scale = Math.min(size.width / gameWidth, size.height / gameHeight);
    const canvas = page.locator('#game canvas');
    await expect.poll(async () => Math.abs((await canvas.boundingBox()).width - gameWidth * scale)).toBeLessThan(2);
    await waitFrames(page);
    const box = await canvas.boundingBox();
    expect(await canvas.evaluate((c) => [c.width, c.height])).toEqual(size.game);
    expect(Math.abs(box.height - gameHeight * scale)).toBeLessThan(2);
    expect(Math.abs(box.x - (size.width - box.width) / 2)).toBeLessThan(2);
    expect(Math.abs(box.y - (size.height - box.height) / 2)).toBeLessThan(2);
    expect(await canvas.evaluate((c) => getComputedStyle(c).imageRendering)).toMatch(/pixelated|crisp/);
  });
}

test('the title shows the dev version label', async ({ page }) => {
  await openGame(page);
  const label = await page.evaluate(() => window.__GAME__.scene.getScene('Title').versionText.text);
  expect(label.startsWith(`v${version}-dev`)).toBe(true);
});

test('missing art becomes placeholders, with one warning listing every key', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.text().startsWith('[assets]') && warnings.push(m.text()));
  await openGame(page);
  const { keys, sizes } = await page.evaluate(() => {
    const game = window.__GAME__;
    const keys = game.registry.get('placeholders');
    const sizes = Object.fromEntries(
      keys.map((k) => {
        const { width, height } = game.textures.getFrame(k);
        return [k, [width, height]];
      }),
    );
    return { keys, sizes };
  });
  expect(warnings).toHaveLength(keys.length > 0 ? 1 : 0);
  for (const key of keys) {
    expect(warnings[0]).toContain(key);
    expect(sizes[key][0], key).toBeGreaterThan(0);
  }
  if (keys.includes('blob_red_idle')) expect(sizes.blob_red_idle).toEqual([32, 32]);
});
