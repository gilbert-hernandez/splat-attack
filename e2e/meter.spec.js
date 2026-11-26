import { expect, test } from '@playwright/test';
import { advance, holdKey, matchState, openGame, releaseKey, setState, startStopped, waitFrames } from './support.js';

const MAX = 100;

/** What the meters and the choice show: each meter's fill width and tint, the panel and the target. */
const shown = (page) =>
  page.evaluate(() => {
    const match = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return {
      meters: match.meters.map((m) => ({ fill: m.fill.isCropped ? m.fill._crop.width : null, full: m.fill.isTinted })),
      panel: match.choicePanel.visible,
      target: match.view.showTarget,
      open: match.keys.choice.open,
    };
  });

test('Space then → fires Bomb by keyboard, and the pair doesn’t move', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'ladder');
  // Not full: Space does nothing.
  await holdKey(page, 'Space');
  await releaseKey(page, 'Space');
  expect((await shown(page)).open).toBe(false);

  await setState(page, { meter: MAX });
  await holdKey(page, 'Space');
  await releaseKey(page, 'Space');
  await waitFrames(page);
  expect(await shown(page)).toMatchObject({ panel: true, target: true, open: true });

  const { col } = (await matchState(page)).pair;
  await holdKey(page, 'ArrowRight');
  await advance(page, 1);
  await releaseKey(page, 'ArrowRight');
  // Held right after the pick: still no move.
  await advance(page, 30);
  const state = await matchState(page);
  expect(state.meter).toBe(0);
  expect(state.pair.col).toBe(col);
  await waitFrames(page);
  expect(await shown(page)).toMatchObject({ panel: false, target: false, open: false });
  expect(problems).toEqual([]);
});

test('the meters follow both boards: filled, full and emptied by the rival', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'ladder');
  await waitFrames(page);
  expect((await shown(page)).meters).toEqual([
    { fill: 0, full: false },
    { fill: 0, full: false },
  ]);
  await setState(page, { meter: 50 });
  await waitFrames(page);
  expect((await shown(page)).meters[0]).toEqual({ fill: 98, full: false });

  // The rival's meter, full and a high stack: the sparring rival Bombs, and its meter shows empty.
  await page.evaluate(() => {
    const { runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    runner.rival.meter = 100;
    for (let row = 2; row < 14; row++) runner.rival.grid[row * 7] = 3;
  });
  await waitFrames(page);
  expect((await shown(page)).meters[1]).toEqual({ fill: 196, full: true });
  await advance(page, 10, 0);
  await waitFrames(page);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Match').runner.rival.meter)).toBe(0);
  expect((await shown(page)).meters[1]).toEqual({ fill: 0, full: false });
  expect(problems).toEqual([]);
});
