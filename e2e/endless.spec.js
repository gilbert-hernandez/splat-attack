import { expect, test } from '@playwright/test';
import {
  advance,
  advanceToEnd,
  clickButton,
  drawn,
  matchState,
  openGame,
  openPause,
  setState,
  startMatch,
  startStopped,
  waitForScene,
  waitFrames,
} from './support.js';

/** A field of a scene, by path. */
const read = (page, scene, path) =>
  page.evaluate(
    ([s, p]) => p.split('.').reduce((o, k) => o[k], /** @type {any} */ (window.__GAME__.scene.getScene(s))),
    [scene, path],
  );
const isActive = (page, key) => page.evaluate((k) => window.__GAME__.scene.isActive(k), key);
const resultReady = (page) =>
  page.waitForFunction(() => {
    const result = /** @type {any} */ (window.__GAME__.scene.getScene('Result'));
    return window.__GAME__.scene.isActive('Result') && result.ready;
  });

async function reachResult(page, mode = 'endless') {
  await startStopped(page, mode);
  await advanceToEnd(page);
  await advance(page, 60, 0);
  await resultReady(page);
}

test('score and level follow the engine', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  await waitFrames(page, 2);
  expect(await read(page, 'UI', 'scoreText.text')).toBe('SCORE 0');
  expect(await read(page, 'UI', 'levelText.text')).toBe('LEVEL 1');

  // Four reds on the floor splat for 80; the next pair is the 11th.
  const grid = new Array(98).fill(0);
  for (const col of [0, 1]) grid[13 * 7 + col] = 1;
  const { pair } = await matchState(page);
  await setState(page, {
    grid,
    pairs: 10,
    pair: { ...pair, pivot: 1, other: 1, col: 2, row: 13, orientation: 1 },
  });
  const shown = () =>
    page.evaluate(() => {
      const { scene } = window.__GAME__;
      const match = /** @type {any} */ (scene.getScene('Match'));
      const ui = /** @type {any} */ (scene.getScene('UI'));
      match.runner.advance(1, 16);
      ui.update();
      return { state: match.runner.state, score: ui.scoreText.text, level: ui.levelText.text };
    });
  for (let i = 0; i < 60; i++) {
    const { state, score, level } = await shown();
    expect(score).toBe(`SCORE ${state.score}`);
    expect(level).toBe(`LEVEL ${state.pairs > 10 ? 2 : 1}`);
    if (state.pairs > 10) break;
  }
  expect(await matchState(page)).toMatchObject({ score: 80, pairs: 11 });
});

test('a top-out shows the board and the message, then the result once', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  expect(await read(page, 'Match', 'gameOverText.visible')).toBe(false);
  await advanceToEnd(page);
  expect(await read(page, 'Match', 'gameOverText.visible')).toBe(true);
  const { grid, ...state } = await matchState(page);
  expect(await drawn(page, 'blobs')).toHaveLength(grid.slice(14).filter(Boolean).length);
  // The ending tick plus 40; the result comes 90 ticks after the ending tick.
  await advance(page, 49, 0);
  await waitFrames(page);
  expect(await isActive(page, 'Match')).toBe(true);
  await advance(page, 1, 0);
  await waitForScene(page, 'Result');
  await waitFrames(page);
  expect([await isActive(page, 'Match'), await isActive(page, 'UI')]).toEqual([false, false]);
  expect(await read(page, 'Result', 'stats')).toMatchObject({
    score: state.score,
    pairs: state.pairs,
    ticks: state.tick,
  });
  expect(problems).toEqual([]);
});

for (const mode of ['endless', 'ladder']) {
  test(`the ${mode} result shows a known match's numbers`, async ({ page }) => {
    await openGame(page);
    await startStopped(page, mode);
    await setState(page, { score: 4321, pairs: 23, tick: 60 * 83 });
    await page.evaluate(() => {
      const match = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
      match.stats.longestChain = 5;
      match.finish();
    });
    await waitForScene(page, 'Result');
    await waitFrames(page);
    expect(await read(page, 'Result', 'mode')).toBe(mode);
    expect(await read(page, 'Result', 'scoreText.text')).toBe('SCORE 4321');
    const rows = await page.evaluate(() =>
      /** @type {any} */ (window.__GAME__.scene.getScene('Result')).statTexts.map((t) => t.text),
    );
    expect(rows).toEqual(['LEVEL 3', 'PAIRS 23', 'LONGEST CHAIN 5', 'TIME 1:23']);
  });
}

test('a won Ladder result shows WIN, the score and the gunk sent', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'ladder');
  await setState(page, { score: 4321, pairs: 23, tick: 60 * 83 });
  await page.evaluate(async () => {
    const url = '/src/core/versus.js';
    const { forceTopOut } = await import(/* @vite-ignore */ url);
    const match = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    forceTopOut(match.runner.match, 1);
    match.stats.longestChain = 5;
    match.stats.gunkSent = 9;
    match.finish();
  });
  await waitForScene(page, 'Result');
  await waitFrames(page);
  const texts = await page.evaluate(() => {
    const result = /** @type {any} */ (window.__GAME__.scene.getScene('Result'));
    return {
      heading: result.children.list.find((c) => c.text === 'WIN')?.text,
      rows: result.statTexts.map((t) => t.text),
    };
  });
  expect(await read(page, 'Result', 'scoreText.text')).toBe('SCORE 4321');
  expect(texts).toEqual({
    heading: 'WIN',
    rows: ['LEVEL 3', 'PAIRS 23', 'LONGEST CHAIN 5', 'TIME 1:23', 'GUNK SENT 9'],
  });
});

test('pausing holds the result back, and Quit then skips it', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  await advanceToEnd(page);
  await page.evaluate(() => {
    /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.manual = false;
  });
  await openPause(page);
  const ticks = await read(page, 'Match', 'overTicks');
  await waitFrames(page, 90);
  expect(await read(page, 'Match', 'overTicks')).toBe(ticks);
  await clickButton(page, 'Pause', 'quitButton');
  await waitForScene(page, 'Title');
  await waitFrames(page, 120);
  expect([await isActive(page, 'Title'), await isActive(page, 'Result')]).toEqual([true, false]);
});

for (const [name, act] of /** @type {[string, (page: any) => Promise<void>][]} */ ([
  ['Enter', (page) => page.keyboard.press('Enter')],
  ['Space', (page) => page.keyboard.press('Space')],
  ['the button', (page) => clickButton(page, 'Result', 'againButton')],
])) {
  test(`${name} plays again with a clean match`, async ({ page }) => {
    const problems = await openGame(page);
    await reachResult(page, 'ladder');
    await act(page);
    await waitForScene(page, 'UI');
    await waitFrames(page);
    expect(await matchState(page)).toMatchObject({ score: 0, pairs: 1, grid: new Array(98).fill(0) });
    expect(await read(page, 'Match', 'mode')).toBe('ladder');
    expect(await read(page, 'Match', 'gameOverText.visible')).toBe(false);
    expect(await read(page, 'Match', 'runner.replay.seed')).not.toBe(1);
    expect(problems).toEqual([]);
  });
}

for (const [name, act] of /** @type {[string, (page: any) => Promise<void>][]} */ ([
  ['Esc', (page) => page.keyboard.press('Escape')],
  ['the button', (page) => clickButton(page, 'Result', 'titleButton')],
])) {
  test(`${name} returns from the result to the title`, async ({ page }) => {
    await openGame(page);
    await reachResult(page);
    await act(page);
    await waitForScene(page, 'Title');
  });
}

test('keys pressed early or held from the match do not leave the result', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  await advanceToEnd(page);
  await page.keyboard.down('Space');
  await advance(page, 60, 0);
  await waitForScene(page, 'Result');
  // Too early: pressed in the same frame, before the delay can pass.
  const stillNotReady = await page.evaluate(() => {
    const result = /** @type {any} */ (window.__GAME__.scene.getScene('Result'));
    result.ready = false;
    result.input.keyboard.emit('keydown-ENTER', { repeat: false });
    return !result.left;
  });
  expect(stillNotReady).toBe(true);
  await page.evaluate(() => {
    /** @type {any} */ (window.__GAME__.scene.getScene('Result')).ready = true;
  });
  // A second down without an up is the system's key repeat.
  await page.keyboard.down('Space');
  await waitFrames(page, 10);
  expect(await isActive(page, 'Result')).toBe(true);
  await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  await waitForScene(page, 'Match');
});

test('a match can be played again and again', async ({ page }) => {
  const problems = await openGame(page);
  await startMatch(page, 'endless');
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('r');
    await resultReady(page);
    await page.keyboard.press('Enter');
    await waitForScene(page, 'UI');
    await waitFrames(page);
  }
  expect(problems).toEqual([]);
});
