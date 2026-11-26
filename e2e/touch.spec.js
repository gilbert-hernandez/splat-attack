import { expect, test } from '@playwright/test';
import {
  advance,
  advanceToEnd,
  clickButton,
  fingers,
  holdKey,
  matchState,
  openGame,
  openPause,
  releaseKey,
  startStopped,
  waitForScene,
  waitFrames,
} from './support.js';

test.use({ hasTouch: true });

const PORTRAIT = { width: 375, height: 667 };
const LANDSCAPE = { width: 844, height: 390 };
const SOFT_DROP = 16;
// Columns per finger travel, as in src/config/touch.js.
const STEP = 34;
const FIRST = 20;

const gesture = (page) =>
  page.evaluate(() => {
    const { touch } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return { kind: touch.press?.kind ?? null, queue: touch.queue, tap: touch.pendingTap };
  });
const NONE = { kind: null, queue: 0, tap: false };

const pair = async (page) => (await matchState(page)).pair;

/** Advance to the next pair, by dropping or by touch. */
async function advanceToLock(page) {
  const { pairs } = await matchState(page);
  for (let i = 0; i < 300 && (await matchState(page)).phase === 'falling'; i++) await advance(page, 1);
  expect((await matchState(page)).phase).toBe('settling');
  for (let i = 0; i < 100 && (await matchState(page)).pairs === pairs; i++) await advance(page, 1);
  expect((await matchState(page)).pairs).toBe(pairs + 1);
}

async function open(page, size = PORTRAIT) {
  await page.setViewportSize(size);
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  return { problems, finger: await fingers(page), x: size.width / 2, y: size.height / 2 };
}

for (const size of [PORTRAIT, LANDSCAPE]) {
  test(`drag, tap and drop act at ${size.width}x${size.height}`, async ({ page }) => {
    const { problems, finger, x, y } = await open(page, size);
    const { col } = await pair(page);

    // One column at a time, following the finger.
    const step = size === PORTRAIT ? STEP : 24.5;
    await finger.press(x, y);
    await finger.drag(step / 2 + 2, 0);
    await advance(page, 2);
    expect((await pair(page)).col).toBe(col + 1);
    await finger.drag(step, 0);
    await advance(page, 2);
    expect((await pair(page)).col).toBe(col + 2);
    await finger.drag(0, 150);
    const { progress, row } = await pair(page);
    await advance(page, 1);
    const after = await pair(page);
    expect((after.row - row) * 256 + after.progress - progress).toBeLessThan(100);
    await finger.lift();

    // A fast drag queues moves, one per tick.
    await finger.press(x, y);
    await finger.drag(-(step / 2 + 2 + 2 * step), 0, { steps: 1 });
    expect((await gesture(page)).queue).toBe(-3);
    for (const want of [col + 1, col, col - 1, col - 1]) {
      await advance(page, 1);
      expect((await pair(page)).col).toBe(want);
    }
    await finger.lift();
    expect((await pair(page)).orientation).toBe(0);

    await finger.press(x, y);
    await finger.lift();
    await advance(page, 3);
    expect((await pair(page)).orientation).toBe(1);

    await finger.press(x, y);
    await finger.drag(5, 60);
    const before = await pair(page);
    await advance(page, 4);
    expect((await pair(page)).row).toBe(before.row + 2);
    await finger.lift();
    expect(await gesture(page)).toEqual(NONE);
    expect(problems).toEqual([]);
  });
}

test('a lock ends a drop until the finger drags down again', async ({ page }) => {
  const { finger, x, y } = await open(page);
  await finger.press(x, y);
  await finger.drag(0, 60);
  await advanceToLock(page);
  const start = await pair(page);
  await finger.drag(0, 60);
  await advance(page, 4);
  const next = await pair(page);
  expect((next.row - start.row) * 256 + next.progress - start.progress).toBeLessThan(100);
  await finger.lift();
  await finger.press(x, y);
  await finger.drag(0, 60);
  await advance(page, 4);
  expect((await pair(page)).row).toBe(next.row + 2);
  await finger.lift();
});

test('a lock and the next tick in one frame: the drop has ended', async ({ page }) => {
  const { finger, x, y } = await open(page);
  await finger.press(x, y);
  await finger.drag(0, 60);
  // All in one call, so no touch event comes between.
  await advance(page, 60);
  const state = await matchState(page);
  expect(state.pairs).toBe(2);
  expect(
    await page.evaluate(() => {
      const { runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
      return runner.replay.inputs.at(-1)[0];
    }),
  ).toBe(0);
  await finger.lift();
});

test('a second finger does nothing', async ({ page }) => {
  const { finger, x, y } = await open(page);
  const { col } = await pair(page);
  await finger.press(x, y);
  await finger.drag(FIRST, 0);
  await advance(page, 1);
  await finger.press(x - 80, y, 1);
  await finger.drag(0, 100, { id: 1 });
  await finger.drag(-80, 0, { id: 1 });
  await finger.drag(STEP, 0);
  expect(await gesture(page)).toEqual({ kind: 'sideways', queue: 1, tap: false });
  await finger.lift();
  await advance(page, 5);
  expect(await pair(page)).toMatchObject({ col: col + 2, orientation: 0 });
});

test('a cancelled touch does nothing', async ({ page }) => {
  const { finger, x, y } = await open(page);
  const before = await pair(page);
  await finger.press(x, y);
  await finger.cancel();
  expect(await gesture(page)).toEqual(NONE);
  await finger.press(x, y);
  await finger.drag(FIRST + STEP, 0);
  expect((await gesture(page)).queue).toBe(2);
  await finger.cancel();
  expect(await gesture(page)).toEqual(NONE);
  await advance(page, 5);
  expect(await pair(page)).toMatchObject({ col: before.col, orientation: 0 });
});

test('a finger held through a pause does nothing after it', async ({ page }) => {
  const { finger, x, y } = await open(page);
  await finger.press(x, y);
  await finger.drag(0, 60);
  await openPause(page);
  expect(await gesture(page)).toEqual(NONE);
  await finger.drag(0, 20);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Match'));
  await finger.drag(60, 0);
  expect(await gesture(page)).toEqual(NONE);
  await finger.lift();
  expect(await gesture(page)).toEqual(NONE);
});

test('touches while paused, also on Resume, do nothing in the match', async ({ page }) => {
  const { finger } = await open(page);
  await openPause(page);
  const box = await page.locator('#game canvas').boundingBox();
  const at = await page.evaluate(() => {
    const { resumeButton } = /** @type {any} */ (window.__GAME__.scene.getScene('Pause'));
    return { x: resumeButton.x, y: resumeButton.y, width: window.__GAME__.scale.gameSize.width };
  });
  const scale = box.width / at.width;
  await finger.press(box.x + at.x * scale, box.y + at.y * scale);
  await finger.lift();
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Match'));
  await waitFrames(page);
  expect(await gesture(page)).toEqual(NONE);
  await advance(page, 2);
  expect((await pair(page)).orientation).toBe(0);
});

test('losing focus and layout changes release the finger', async ({ page }) => {
  const { finger, x, y } = await open(page, { width: 390, height: 844 });
  await finger.press(x, y);
  await finger.drag(0, 60);
  expect((await gesture(page)).kind).toBe('drop');
  await page.evaluate(() => window.__GAME__.events.emit('blur'));
  expect(await gesture(page)).toEqual(NONE);
  await finger.lift();
  // A focus loss also pauses.
  await waitForScene(page, 'Pause');
  await clickButton(page, 'Pause', 'resumeButton');
  await page.waitForFunction(() => !window.__GAME__.scene.isActive('Pause'));
  await waitFrames(page);

  await finger.press(x, y);
  await finger.drag(0, 60);
  expect((await gesture(page)).kind).toBe('drop');
  await page.setViewportSize({ width: 390, height: 760 });
  await page.waitForFunction(() => window.__GAME__.scale.gameSize.height === 700);
  await waitFrames(page);
  expect(await gesture(page)).toEqual(NONE);
  expect(await page.evaluate(() => window.__GAME__.scene.isActive('Pause'))).toBe(false);
  await finger.lift();
});

test('a press that began in a menu does nothing when lifted in the match', async ({ page }) => {
  await page.setViewportSize(PORTRAIT);
  await openGame(page);
  const finger = await fingers(page);
  await finger.press(20, 600);
  await page.evaluate(() => void window.__GAME__.scene.getScene('Title').scene.start('Match', { mode: 'endless' }));
  await waitForScene(page, 'UI');
  await waitFrames(page);
  expect(await gesture(page)).toEqual(NONE);
  await finger.drag(60, 0);
  await finger.lift();
  expect(await gesture(page)).toEqual(NONE);
  expect((await pair(page)).orientation).toBe(0);
});

test('the mouse makes no gestures', async ({ page }) => {
  const { x, y } = await open(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await waitFrames(page);
  expect(await gesture(page)).toEqual(NONE);
  await page.mouse.move(x + 100, y + 5, { steps: 4 });
  await page.mouse.up();
  await waitFrames(page);
  expect(await gesture(page)).toEqual(NONE);
});

test('keys work during a drag', async ({ page }) => {
  const { finger, x, y } = await open(page);
  const { col } = await pair(page);
  await finger.press(x, y);
  await finger.drag(FIRST, 0);
  await holdKey(page, 'KeyQ');
  await advance(page, 1);
  expect(await pair(page)).toMatchObject({ col: col + 1, orientation: 3 });
  await releaseKey(page, 'KeyQ');
  await finger.lift();
});

test('a match played by touch replays to the same hash', async ({ page }) => {
  test.setTimeout(90000);
  const { problems, finger, x, y } = await open(page);
  for (const [columns, turns] of [
    [-2, 1],
    [2, 0],
    [-1, 2],
    [1, 1],
    [3, 0],
    [0, 3],
  ]) {
    for (let i = 0; i < turns; i++) {
      await finger.press(x, y);
      await finger.lift();
      await advance(page, 2);
    }
    if (columns) {
      await finger.press(x, y);
      await finger.drag(Math.sign(columns) * (FIRST + (Math.abs(columns) - 1) * STEP), 10);
      await finger.lift();
      await advance(page, 4);
    }
    await finger.press(x, y);
    await finger.drag(4, 80);
    await advanceToLock(page);
    await finger.lift();
  }
  const played = await matchState(page);
  expect(played.pairs).toBe(7);
  await advance(page, 60, SOFT_DROP);
  await advanceToEnd(page);
  const { hash, replayed, used } = await page.evaluate(async () => {
    const url = '/src/core/replay.js';
    const { hashState, playReplay } = await import(/* @vite-ignore */ url);
    const { runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    const copy = JSON.parse(JSON.stringify(runner.replay));
    return {
      hash: hashState(runner.state),
      replayed: hashState(playReplay(copy)),
      used: copy.inputs.reduce((all, [mask]) => all | mask, 0),
    };
  });
  expect(replayed).toBe(hash);
  expect(used & 1 && used & 2 && used & 4 && used & 16).toBeTruthy();
  expect(problems).toEqual([]);
});
