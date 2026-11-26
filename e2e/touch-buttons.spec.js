import { expect, test } from '@playwright/test';
import {
  advance,
  advanceToEnd,
  fingers,
  inputMode,
  matchState,
  openGame,
  startStopped,
  toPage,
  useTouch,
  waitForScene,
  waitFrames,
} from './support.js';

test.use({ hasTouch: true });

const PORTRAIT = { width: 375, height: 667 };
const LANDSCAPE = { width: 844, height: 390 };
const { ROTATE_CW, ROTATE_CCW } = { ROTATE_CW: 4, ROTATE_CCW: 8 };
// Finger travel for a first column and each one after, as in touch.spec.js (portrait).
const FIRST = 20;
const STEP = 34;

/** A match button's center on the page, its look and whether it takes presses. */
async function button(page, name, sceneKey = 'Match') {
  const b = await page.evaluate(
    ([n, k]) => {
      const it = /** @type {any} */ (window.__GAME__.scene.getScene(k)).buttons?.[n] ?? null;
      const scene = /** @type {any} */ (window.__GAME__.scene.getScene(k));
      const target = it ?? scene[n];
      return {
        x: target.x,
        y: target.y,
        look: target.look,
        visible: target.visible,
        enabled: it ? it.zone.input.enabled : true,
      };
    },
    [name, sceneKey],
  );
  const at = await toPage(page, b.x, b.y);
  return { ...b, x: at.x, y: at.y };
}

const gesture = (page) =>
  page.evaluate(() => {
    const { touch } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return { kind: touch.press?.kind ?? null, id: touch.press?.id ?? null, queue: touch.queue, tap: touch.pendingTap };
  });
const pair = async (page) => (await matchState(page)).pair;
const lastMask = (page) =>
  page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.replay.inputs.at(-1)[0]);
const isActive = (page, key) => page.evaluate((k) => window.__GAME__.scene.isActive(k), key);

async function open(page, size = PORTRAIT, mode = 'endless') {
  await page.setViewportSize(size);
  const problems = await openGame(page);
  await startStopped(page, mode);
  await useTouch(page);
  const finger = await fingers(page);
  await waitFrames(page);
  return { problems, finger, x: size.width / 2, y: size.height / 3 };
}

for (const size of [PORTRAIT, LANDSCAPE]) {
  test(`each button acts at ${size.width}x${size.height}`, async ({ page }) => {
    const { problems, finger } = await open(page, size);
    expect(await inputMode(page)).toBe('touch');

    const ccw = await button(page, 'ccw');
    expect(ccw).toMatchObject({ visible: true, enabled: true, look: 'normal' });
    await finger.press(ccw.x, ccw.y);
    expect((await button(page, 'ccw')).look).toBe('pressed');
    await advance(page, 6);
    expect((await pair(page)).orientation).toBe(3);
    expect(await gesture(page)).toMatchObject({ kind: null });
    await finger.lift();
    expect((await button(page, 'ccw')).look).toBe('normal');

    const cw = await button(page, 'cw');
    await finger.press(cw.x, cw.y);
    await finger.lift();
    await advance(page, 6);
    expect((await pair(page)).orientation).toBe(0);
    expect((await gesture(page)).tap).toBe(false);

    const pause = await button(page, 'pause');
    await finger.press(pause.x, pause.y);
    expect(await isActive(page, 'Pause')).toBe(false);
    await finger.lift();
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Pause')?.ready);
    const resume = await button(page, 'resumeButton', 'Pause');
    await finger.press(resume.x, resume.y);
    await finger.lift();
    await page.waitForFunction(() => window.__GAME__.scene.isActive('Match'));
    await waitFrames(page);
    for (const name of ['ccw', 'cw', 'pause']) expect((await button(page, name)).look, name).toBe('normal');
    expect(problems).toEqual([]);
  });
}

test('sliding off pause or a cancelled touch on it does nothing', async ({ page }) => {
  const { finger } = await open(page);
  const before = await pair(page);
  const pause = await button(page, 'pause');
  await finger.press(pause.x, pause.y);
  await finger.drag(-150, 200);
  expect((await button(page, 'pause')).look).toBe('normal');
  await finger.lift();
  await finger.press(pause.x, pause.y);
  await finger.cancel();
  await waitFrames(page);
  expect(await isActive(page, 'Pause')).toBe(false);
  expect((await button(page, 'pause')).look).toBe('normal');
  await advance(page, 4);
  expect(await pair(page)).toMatchObject({ col: before.col, orientation: 0 });
});

test('a finger sliding from a rotate button across the board only rotates', async ({ page }) => {
  const { finger } = await open(page);
  const before = await pair(page);
  const ccw = await button(page, 'ccw');
  await finger.press(ccw.x, ccw.y);
  await finger.drag(100, -300, { steps: 8 });
  expect(await gesture(page)).toMatchObject({ kind: null, queue: 0 });
  await finger.lift();
  await advance(page, 4);
  expect(await pair(page)).toMatchObject({ col: before.col, orientation: 3 });
  expect((await pair(page)).row).toBeLessThanOrEqual(before.row + 1);
});

test('buttons are hidden in keyboard mode, and the touch that shows them is a gesture', async ({ page }) => {
  const { finger } = await open(page);
  await page.keyboard.press('Shift');
  await page.mouse.click(5, 5);
  await waitFrames(page);
  expect(await inputMode(page)).toBe('keyboard');
  for (const name of ['ccw', 'cw', 'pause']) {
    expect(await button(page, name), name).toMatchObject({ visible: false, enabled: false });
  }
  // A tap where the hidden counterclockwise button is: it shows the buttons and rotates clockwise.
  const ccw = await button(page, 'ccw');
  await finger.press(ccw.x, ccw.y);
  expect(await inputMode(page)).toBe('touch');
  expect((await button(page, 'ccw')).look).toBe('normal');
  await finger.lift();
  await advance(page, 3);
  expect((await pair(page)).orientation).toBe(1);
  expect(await button(page, 'ccw')).toMatchObject({ visible: true, enabled: true });
});

test('a rotate button works during a drag', async ({ page }) => {
  const { finger, x, y } = await open(page);
  const { col } = await pair(page);
  const ccw = await button(page, 'ccw');
  await finger.press(x, y, 0);
  await finger.drag(FIRST, 0);
  await finger.press(ccw.x, ccw.y, 1);
  await advance(page, 1);
  expect(await pair(page)).toMatchObject({ col: col + 1, orientation: 3 });
  await finger.drag(STEP, 0);
  expect(await gesture(page)).toMatchObject({ kind: 'sideways', queue: 1 });
  await finger.liftOne(1);
  await advance(page, 1);
  expect(await pair(page)).toMatchObject({ col: col + 2, orientation: 3 });
  await finger.lift();
});

test('a drag works while a rotate button is held', async ({ page }) => {
  const { finger, x, y } = await open(page);
  const { col } = await pair(page);
  const cw = await button(page, 'cw');
  await finger.press(cw.x, cw.y, 0);
  await finger.press(x, y, 1);
  await finger.drag(FIRST, 0, { id: 1 });
  expect((await gesture(page)).kind).toBe('sideways');
  await advance(page, 2);
  expect(await pair(page)).toMatchObject({ col: col + 1, orientation: 1 });
  await finger.lift();
});

test('both rotate buttons at once give both turns on one tick', async ({ page }) => {
  const { finger } = await open(page);
  const cw = await button(page, 'cw');
  const ccw = await button(page, 'ccw');
  await finger.press(cw.x, cw.y, 0);
  await finger.press(ccw.x, ccw.y, 1);
  await advance(page, 1);
  expect((await lastMask(page)) & (ROTATE_CW | ROTATE_CCW)).toBe(ROTATE_CW | ROTATE_CCW);
  await finger.lift();
});

test('a button and a gesture landing in one touch event both act', async ({ page }) => {
  const { x, y } = await open(page);
  const { col } = await pair(page);
  const ccw = await button(page, 'ccw');
  // CDP sends one changed finger per event, so send the DOM events directly.
  await page.evaluate(
    ([points]) => {
      const canvas = document.querySelector('#game canvas');
      const touches = (list) =>
        list.map(
          (p) => new Touch({ identifier: p.id, target: canvas, clientX: p.x, clientY: p.y, pageX: p.x, pageY: p.y }),
        );
      const send = (type, list, changed) =>
        canvas.dispatchEvent(
          new TouchEvent(type, {
            touches: touches(list),
            targetTouches: touches(list),
            changedTouches: touches(changed),
            bubbles: true,
            cancelable: true,
          }),
        );
      /** @type {any} */ (window).__touch = { send, points };
      send('touchstart', points, points);
    },
    [
      [
        { id: 7, x: ccw.x, y: ccw.y },
        { id: 8, x, y },
      ],
    ],
  );
  await waitFrames(page, 2);
  expect((await button(page, 'ccw')).look).toBe('pressed');
  await page.evaluate(() => {
    const { send, points } = /** @type {any} */ (window).__touch;
    const moved = [points[0], { ...points[1], x: points[1].x + 22 }];
    send('touchmove', moved, [moved[1]]);
  });
  await waitFrames(page, 2);
  expect((await gesture(page)).kind).toBe('sideways');
  await advance(page, 2);
  expect(await pair(page)).toMatchObject({ col: col + 1, orientation: 3 });
  await page.evaluate(() => {
    const { send, points } = /** @type {any} */ (window).__touch;
    send('touchend', [], points);
  });
  await waitFrames(page, 2);
  expect(await gesture(page)).toMatchObject({ kind: null });
});

test('switching mode in a landscape Ladder match moves the boards and keeps the match', async ({ page }) => {
  const { finger } = await open(page, LANDSCAPE, 'ladder');
  const playerX = () => page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).view.x);
  expect(await playerX()).toBe(136);
  await page.mouse.click(5, 5);
  await waitFrames(page);
  expect(await playerX()).toBe(64);
  await advance(page, 30);
  const before = await page.evaluate(() => {
    const { runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return { tick: runner.state.tick, seed: runner.replay.seed, inputs: runner.replay.inputs.length };
  });
  await finger.press(400, 200);
  await finger.lift();
  expect(await playerX()).toBe(136);
  expect(await isActive(page, 'Pause')).toBe(false);
  const after = await page.evaluate(() => {
    const { runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return { tick: runner.state.tick, seed: runner.replay.seed, inputs: runner.replay.inputs.length };
  });
  expect(after).toEqual(before);
});

test('a match played with buttons and gestures replays to the same hash', async ({ page }) => {
  test.setTimeout(90000);
  const { problems, finger, x, y } = await open(page);
  const cw = await button(page, 'cw');
  const ccw = await button(page, 'ccw');
  for (const [turn, columns] of [
    [ccw, -2],
    [cw, 2],
    [ccw, 1],
    [null, -3],
    [cw, 3],
  ]) {
    if (turn) {
      await finger.press(turn.x, turn.y, 1);
      await finger.liftOne(1);
      await advance(page, 2);
    }
    await finger.press(x, y);
    await finger.drag(Math.sign(columns) * (FIRST + (Math.abs(columns) - 1) * STEP), 4);
    await finger.lift();
    await advance(page, 6);
    const { pairs } = await matchState(page);
    for (let i = 0; i < 400 && (await matchState(page)).pairs === pairs; i++) await advance(page, 4, 16);
  }
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
  expect(used & ROTATE_CW && used & ROTATE_CCW && used & 1 && used & 2).toBeTruthy();
  expect(problems).toEqual([]);
  await advance(page, 60, 0);
  await waitForScene(page, 'Result');
});
