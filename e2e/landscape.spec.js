import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { advance, advanceToEnd, clickButton, openGame, openPause, startStopped, waitForScene } from './support.js';

// Every object's place at 960x540, compared with a stored fixture. If a move is intended, run
// `UPDATE_LANDSCAPE=1 npx playwright test landscape` and review the diff.
const FIXTURE = new URL('./fixtures/landscape.json', import.meta.url);

/** A scene's objects as sorted text lines. Text sizes are left out: they depend on the fonts installed. */
const places = (page, key) =>
  page.evaluate((k) => {
    const list = (objects, prefix) =>
      objects.flatMap((o) => {
        const text = o.type === 'Text';
        const name = text ? o.text.split('\n')[0].replace(/^v\d.*/, 'version') : (o.texture?.key ?? '');
        const size = text ? o.style.fontSize : `${o.displayWidth}x${o.displayHeight}`;
        const line = `${prefix}${o.type} ${name} ${o.x},${o.y} ${size} origin ${o.originX},${o.originY} depth ${o.depth}`;
        return [line + (o.visible ? '' : ' hidden'), ...(o.list ? list(o.list, `${prefix}${o.type}>`) : [])];
      });
    return list(window.__GAME__.scene.getScene(k).children.list, '').sort();
  }, key);

test('every object is where it was at 960x540', async ({ page }) => {
  await openGame(page);
  /** @type {Record<string, string[]>} */
  const actual = { Title: await places(page, 'Title') };
  await page.keyboard.press('Enter');
  await waitForScene(page, 'ModeSelect');
  actual.ModeSelect = await places(page, 'ModeSelect');
  await page.keyboard.press('Escape');
  await waitForScene(page, 'Title');
  for (const mode of ['ladder', 'endless']) {
    await startStopped(page, mode);
    await advance(page, 60);
    actual[`Match ${mode}`] = await places(page, 'Match');
    actual[`UI ${mode}`] = await places(page, 'UI');
    if (mode === 'endless') break;
    await openPause(page);
    actual.Pause = await places(page, 'Pause');
    await clickButton(page, 'Pause', 'quitButton');
    await waitForScene(page, 'Title');
  }
  await advanceToEnd(page);
  actual['Match over'] = await places(page, 'Match');
  await advance(page, 60, 0);
  await waitForScene(page, 'Result');
  actual.Result = await places(page, 'Result');

  if (process.env.UPDATE_LANDSCAPE) writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 2)}\n`);
  expect(actual).toEqual(JSON.parse(readFileSync(FIXTURE, 'utf8')));
});
