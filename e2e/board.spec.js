import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  advance,
  advanceToEnd,
  clickButton,
  drawn,
  holdKey,
  matchState,
  openGame,
  openPause,
  releaseKey,
  setState,
  startMatch,
  startStopped,
  waitFrames,
} from './support.js';

const CELL = 32;
const TOP = 100;
const LEFT = { endless: 368, ladder: 64 };
const COLOR = ['', 'red', 'yellow', 'green', 'blue', 'purple'];
const SOFT_DROP = 16;

const cellX = (col) => LEFT.endless + col * CELL;
const cellY = (row) => TOP + (row - 2) * CELL;

/** A 14-row grid from [col, row, color] triples. */
function grid(...cells) {
  const out = new Array(7 * 14).fill(0);
  for (const [col, row, color] of cells) out[row * 7 + col] = color;
  return out;
}

const held = (page) =>
  page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).keys.held.slice());

for (const [code, check] of /** @type {[string, (before: any, after: any) => void][]} */ ([
  ['KeyA', (a, b) => expect(b.col).toBe(a.col - 1)],
  ['ArrowLeft', (a, b) => expect(b.col).toBe(a.col - 1)],
  ['KeyD', (a, b) => expect(b.col).toBe(a.col + 1)],
  ['ArrowRight', (a, b) => expect(b.col).toBe(a.col + 1)],
  ['KeyS', (a, b) => expect(b.progress).toBe(a.progress + 128)],
  ['ArrowDown', (a, b) => expect(b.progress).toBe(a.progress + 128)],
  ['KeyE', (_a, b) => expect(b.orientation).toBe(1)],
  ['KeyX', (_a, b) => expect(b.orientation).toBe(1)],
  ['KeyQ', (_a, b) => expect(b.orientation).toBe(3)],
  ['KeyZ', (_a, b) => expect(b.orientation).toBe(3)],
])) {
  test(`${code} acts`, async ({ page }) => {
    await openGame(page);
    await startStopped(page, 'endless');
    const before = (await matchState(page)).pair;
    await holdKey(page, code);
    await advance(page, 1);
    check(before, (await matchState(page)).pair);
    await releaseKey(page, code);
  });
}

test('a held move repeats after its delay', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  const col = async () => (await matchState(page)).pair.col;
  await holdKey(page, 'KeyA');
  await advance(page, 10);
  expect(await col()).toBe(2);
  await advance(page, 1);
  expect(await col()).toBe(1);
  await advance(page, 3);
  expect(await col()).toBe(0);
});

test('game keys do not scroll the page', async ({ page }) => {
  await openGame(page);
  await startMatch(page, 'endless');
  const prevented = await page.evaluate(() =>
    ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ' '].map((key) => {
      const keyCode = { ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, ' ': 32 }[key];
      const event = new KeyboardEvent('keydown', { key, keyCode, bubbles: true, cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  );
  expect(prevented).toEqual([true, true, true, true, true]);
});

test('the pair, ghost, bridges and preview are drawn', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  const state = await matchState(page);
  await setState(page, {
    grid: grid([3, 13, 3], [5, 13, 2], [6, 13, 2], [6, 12, 2]),
    pair: { ...state.pair, pivot: 1, other: 4, row: 5, progress: 128, orientation: 1 },
    queue: [
      [1, 2],
      [3, 4],
    ],
  });
  expect(await drawn(page, 'pair')).toMatchObject([
    { key: 'blob_red_idle', x: cellX(3), y: cellY(5) + 16, cut: 0 },
    { key: 'blob_blue_idle', x: cellX(4), y: cellY(5) + 16, cut: 0 },
  ]);
  expect(await drawn(page, 'ghost')).toMatchObject([
    { key: 'blob_red_idle', x: cellX(3), y: cellY(12) },
    { key: 'blob_blue_idle', x: cellX(4), y: cellY(13) },
  ]);
  expect((await drawn(page, 'bridges')).map((b) => b.key)).toEqual(['blob_yellow_bridge_v', 'blob_yellow_bridge_h']);

  const keys = async () => (await drawn(page, 'next')).map((s) => s.key.split('_')[1]);
  expect(await keys()).toEqual(['yellow', 'red', 'blue', 'green']);
  const [upper, lower, second] = await drawn(page, 'next');
  expect([upper.y < lower.y, lower.y < second.y, upper.x > LEFT.endless + 7 * CELL]).toEqual([true, true, true]);
  // Drop the pair; the preview moves up when the next one spawns.
  await advance(page, 35, SOFT_DROP);
  expect((await keys()).slice(0, 2)).toEqual(['blue', 'green']);
  expect(problems).toEqual([]);
});

test('nothing is drawn above the top edge', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  // The spawned pair's other half is all hidden; then it slides in.
  expect(await drawn(page, 'pair')).toHaveLength(1);
  await advance(page, 10);
  const pair = await drawn(page, 'pair');
  expect(pair).toHaveLength(2);
  expect(pair[1].y + pair[1].cut).toBe(TOP);
  expect(pair[1].cut).toBeGreaterThan(0);
  // Blobs in hidden rows aren't drawn.
  await setState(page, { grid: grid([0, 0, 1], [0, 1, 1]) });
  expect(await drawn(page, 'blobs')).toEqual([]);
});

test('pausing stops the match and releases keys', async ({ page }) => {
  await openGame(page);
  await startMatch(page, 'endless');
  await holdKey(page, 'KeyA');
  await openPause(page);
  const { tick } = await matchState(page);
  expect(await held(page)).toEqual([]);
  await page.keyboard.press('KeyE');
  await waitFrames(page, 10);
  expect((await matchState(page)).tick).toBe(tick);
  await page.keyboard.up('KeyA');
  await clickButton(page, 'Pause', 'resumeButton');
  await page.waitForFunction(
    (t) => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.state.tick > t,
    tick,
  );
  expect(await held(page)).toEqual([]);
  expect((await matchState(page)).pair.orientation).toBe(0);
});

test('losing focus releases keys', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  await holdKey(page, 'KeyA');
  await page.evaluate(() => window.__GAME__.events.emit('blur'));
  expect(await held(page)).toEqual([]);
  const { col } = (await matchState(page)).pair;
  await advance(page, 20);
  expect((await matchState(page)).pair.col).toBe(col);
});

test('a finished match stays on screen until the result, and Quit and a new match work', async ({ page }) => {
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  await advanceToEnd(page);
  const state = await matchState(page);
  expect(state.phase).toBe('over');
  expect(await drawn(page, 'blobs')).toHaveLength(state.grid.slice(14).filter(Boolean).length);
  expect(await drawn(page, 'pair')).toEqual([]);
  await openPause(page);
  await clickButton(page, 'Pause', 'quitButton');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Title'));
  await waitFrames(page);
  await startMatch(page, 'endless');
  expect((await matchState(page)).phase).not.toBe('over');
  expect(problems).toEqual([]);
});

test('Ladder has a live player board and an empty rival board', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'ladder');
  await advance(page, 10);
  expect((await drawn(page, 'pair'))[0].x).toBe(LEFT.ladder + 3 * CELL);
  const rival = await page.evaluate(() => {
    const { rivalView } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return [rivalView.x, ...Object.values(rivalView.pools).map((pool) => /** @type {any} */ (pool).sprites.length)];
  });
  expect(rival).toEqual([672, 0, 0, 0, 0, 0, 0]);
});

test('each match has its own seed', async ({ page }) => {
  await openGame(page);
  const seeds = new Set();
  for (let i = 0; i < 3; i++) {
    await startMatch(page, 'endless');
    seeds.add(
      await page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.replay.seed),
    );
    await openPause(page);
    await clickButton(page, 'Pause', 'quitButton');
    await page.waitForFunction(() => window.__GAME__.scene.isActive('Title'));
    await waitFrames(page);
  }
  expect(seeds.size).toBe(3);
});

// The view can't change the rules: the same results as without it, checked as in Node.
const DIR = new URL('../tests/core/replays/', import.meta.url);
for (const file of readdirSync(DIR)) {
  const { replay, expected } = JSON.parse(readFileSync(new URL(file, DIR), 'utf8'));
  test(`plays ${file} through the view`, async ({ page }) => {
    await openGame(page);
    await startStopped(page, 'endless', replay.seed);
    const actual = await page.evaluate(async (inputs) => {
      const url = '/src/core/replay.js';
      const { hashState } = await import(/* @vite-ignore */ url);
      const match = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
      const { runner, view } = match;
      const checkpoints = [];
      let longestChain = 0;
      const { onTick } = runner;
      runner.onTick = (state, events) => {
        onTick(state, events);
        view.draw();
        for (const event of events) if (event.type === 'splat') longestChain = Math.max(longestChain, event.chain);
        if (state.tick % 600 === 0) checkpoints.push(hashState(state));
      };
      for (const [mask, ticks] of inputs) runner.advance(ticks, mask);
      const { tick, phase, chain, score } = runner.state;
      return { ticks: tick, phase, chain, score, longestChain, hash: hashState(runner.state), checkpoints };
    }, replay.inputs);
    expect(actual).toEqual(expected);

    // Let animations end, then compare the drawing with the grid. Mid-chain replays finish first.
    for (let i = 0; i < 100 && !['falling', 'over'].includes((await matchState(page)).phase); i++) {
      await advance(page, 12, 0);
    }
    await advance(page, 1, 0);
    const { grid: cells, stains } = await matchState(page);
    const visible = (layer) =>
      layer
        .map((color, i) => ({ color, col: i % 7, row: Math.floor(i / 7) }))
        .filter(({ color, row }) => color && row >= 2)
        .map(({ color, col, row }) => `${COLOR[color]} ${cellX(col)} ${cellY(row)}`);
    const got = async (pool) => (await drawn(page, pool)).map((b) => `${b.key.split('_')[1]} ${b.x} ${b.y}`);
    expect((await got('blobs')).sort()).toEqual(visible(cells).sort());
    expect(stains.some(Boolean)).toBe(true);
    expect((await got('stains')).sort()).toEqual(visible(stains).sort());
  });
}
