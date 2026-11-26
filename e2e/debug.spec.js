import { expect, test } from '@playwright/test';
import {
  advance,
  matchState,
  openGame,
  openPause,
  startMatch,
  startStopped,
  waitForScene,
  waitFrames,
} from './support.js';

const runner = (page) =>
  page.evaluate(() => {
    const { frozen, rate, replay } = /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner;
    return { frozen, rate, hasReplay: replay !== null };
  });

async function press(page, code) {
  await page.keyboard.press(code);
  await waitFrames(page, 3);
}

test('two color keys set the next pair', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  const { queue } = await matchState(page);
  await press(page, 'Digit3');
  expect((await matchState(page)).queue).toEqual(queue);
  await press(page, 'Digit5');
  expect((await matchState(page)).queue).toEqual([[3, 5], queue[1]]);
  expect((await runner(page)).hasReplay).toBe(false);
});

test('B loads boards in turn and play continues', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  await advance(page, 100, 16);
  const { queue } = await matchState(page);
  const counts = new Set();
  // Every prepared board once (chain, top-out, stains, mid-game), so the next press wraps to chain.
  for (let i = 0; i < 4; i++) {
    await press(page, 'KeyB');
    const state = await matchState(page);
    expect(state).toMatchObject({ phase: 'falling', queue, chain: 0, pair: { col: 3, row: 2 } });
    counts.add(state.grid.filter(Boolean).length);
    await advance(page, 1, 0);
  }
  expect(counts.size).toBe(4);
  expect((await runner(page)).hasReplay).toBe(false);
  const { pairs } = await matchState(page);
  await advance(page, 60, 16);
  expect((await matchState(page)).pairs).toBeGreaterThan(pairs);

  // Loading in the middle of a chain works too.
  await press(page, 'KeyB');
  for (let i = 0; i < 3; i++) await advance(page, 1, 1);
  while ((await matchState(page)).chain < 2) await advance(page, 5, 16);
  await press(page, 'KeyB');
  expect((await matchState(page)).chain).toBe(0);
  await advance(page, 100, 0);
  expect(problems).toEqual([]);
});

test('P freezes, . steps one tick, and unfreezing continues', async ({ page }) => {
  await openGame(page);
  await startMatch(page, 'endless');
  await press(page, 'KeyP');
  const { tick } = await matchState(page);
  await waitFrames(page, 20);
  expect((await matchState(page)).tick).toBe(tick);
  await press(page, 'Period');
  expect((await matchState(page)).tick).toBe(tick + 1);
  await press(page, 'KeyP');
  await page.waitForFunction(
    (t) => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.state.tick > t + 1,
    tick,
  );
  await press(page, 'Period');
  expect(await runner(page)).toEqual({ frozen: true, rate: 1, hasReplay: true });
});

test('F fast-forwards on and off and keeps the replay', async ({ page }) => {
  await openGame(page);
  await startMatch(page, 'endless');
  await press(page, 'KeyF');
  expect(await runner(page)).toEqual({ frozen: false, rate: 8, hasReplay: true });
  await press(page, 'KeyF');
  expect((await runner(page)).rate).toBe(1);
});

test('R ends the match through the message and the result, also while frozen', async ({ page }) => {
  const problems = await openGame(page);
  await startMatch(page, 'ladder');
  await press(page, 'KeyP');
  await press(page, 'KeyR');
  const shown = await page.evaluate(
    () => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).gameOverText.visible,
  );
  expect(shown).toBe(true);
  expect((await runner(page)).hasReplay).toBe(false);
  await waitForScene(page, 'Result');
  expect(problems).toEqual([]);
});

test('debug keys do nothing while paused', async ({ page }) => {
  await openGame(page);
  await startMatch(page, 'endless');
  await openPause(page);
  const before = await matchState(page);
  for (const code of ['Digit1', 'Digit2', 'KeyB', 'KeyP', 'Period', 'KeyF', 'KeyR']) await press(page, code);
  expect(await matchState(page)).toEqual(before);
  expect(await runner(page)).toEqual({ frozen: false, rate: 1, hasReplay: true });
});
