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
  // Every prepared board once (chain, top-out, stains, gunk, mid-game), so the next press wraps to chain.
  for (let i = 0; i < 5; i++) {
    await press(page, 'KeyB');
    const state = await matchState(page);
    expect(state).toMatchObject({ phase: 'falling', queue, chain: 0, pair: { col: 3, row: 2 } });
    counts.add(state.grid.filter(Boolean).length);
    await advance(page, 1, 0);
  }
  expect(counts.size).toBe(5);
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
  const shown = await page.evaluate(() => {
    const { gameOverText, runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return [gameOverText.visible, gameOverText.text, runner.outcome];
  });
  expect(shown).toEqual([true, 'YOU\nLOSE', 'loss']);
  expect((await runner(page)).hasReplay).toBe(false);
  await waitForScene(page, 'Result');
  expect(problems).toEqual([]);
});

test('G and H send a row of gunk to each board, which drops by the normal rules', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'ladder');
  await press(page, 'KeyG');
  await press(page, 'KeyH');
  await press(page, 'KeyH');
  const pending = () =>
    page.evaluate(() => {
      const { runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
      return [runner.state.pending, runner.rival.pending, runner.replay];
    });
  expect(await pending()).toEqual([7, 14, null]);
  // The player's pair drops, then its gunk lands as one row.
  await advance(page, 200, 16);
  const [player] = await pending();
  expect(player).toBe(0);
  expect((await matchState(page)).grid.filter((v) => v === 6).length).toBe(7);
  expect(problems).toEqual([]);
});

test('G in Endless gunks the player and H does nothing', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  await press(page, 'KeyH');
  expect((await matchState(page)).pending).toBe(0);
  expect((await runner(page)).hasReplay).toBe(true);
  await press(page, 'KeyG');
  expect((await matchState(page)).pending).toBe(7);
});

test('W wins a Ladder match through the message and a WIN result', async ({ page }) => {
  const problems = await openGame(page);
  await startMatch(page, 'ladder');
  await press(page, 'KeyW');
  const text = await page.evaluate(() => {
    const { gameOverText, runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return { visible: gameOverText.visible, text: gameOverText.text, outcome: runner.outcome };
  });
  expect(text).toEqual({ visible: true, text: 'YOU\nWIN', outcome: 'win' });
  expect((await runner(page)).hasReplay).toBe(false);
  await waitForScene(page, 'Result');
  const heading = await page.evaluate(() =>
    /** @type {any} */ (window.__GAME__.scene.getScene('Result')).children.list
      .filter((c) => c.type === 'Text')
      .map((c) => c.text),
  );
  expect(heading).toContain('WIN');
  expect(problems).toEqual([]);
});

test('debug keys do nothing while paused', async ({ page }) => {
  await openGame(page);
  await startMatch(page, 'endless');
  await openPause(page);
  const before = await matchState(page);
  for (const code of ['Digit1', 'Digit2', 'KeyB', 'KeyP', 'Period', 'KeyF', 'KeyG', 'KeyH', 'KeyW', 'KeyR']) {
    await press(page, code);
  }
  expect(await matchState(page)).toEqual(before);
  expect(await runner(page)).toEqual({ frozen: false, rate: 1, hasReplay: true });
});
