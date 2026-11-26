import { expect, test } from '@playwright/test';
import { advance, fingers, matchState, openGame, startStopped, useTouch } from './support.js';

// A phone browser: mobile viewport rules and touch.
test.use({ hasTouch: true, isMobile: true });

// Both leave bars beside the canvas: 47 px each side in portrait, 75 in landscape.
const PORTRAIT = { width: 375, height: 500 };
const LANDSCAPE = { width: 844, height: 390 };

const zoom = (page) => page.evaluate(() => window.visualViewport?.scale ?? 1);
const scroll = (page) => page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));

/** Touches sent through CDP without waiting on the game, for pages without one. */
async function rawFingers(page) {
  const cdp = await page.context().newCDPSession(page);
  return async (type, touchPoints = []) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    // About a frame, as a real finger would move.
    await page.waitForTimeout(16);
  };
}

/** Two fingers spreading apart around (x, y). */
async function pinch(send, x, y) {
  const at = (d) => [
    { id: 0, x: x - 20 - d, y },
    { id: 1, x: x + 20 + d, y },
  ];
  await send('touchStart', at(0));
  for (let d = 12; d <= 120; d += 12) await send('touchMove', at(d));
  await send('touchEnd');
}

/** One finger dragging down from (x, y). */
async function dragDown(send, x, y) {
  await send('touchStart', [{ x, y }]);
  for (let d = 30; d <= 300; d += 30) await send('touchMove', [{ x, y: y + d }]);
  await send('touchEnd');
}

test('a plain page zooms and scrolls under the same touches', async ({ page }) => {
  // The control: shows the touches below would zoom and scroll a page that doesn't block them.
  await page.setViewportSize(PORTRAIT);
  await page.setContent(
    '<meta name="viewport" content="width=device-width, initial-scale=1"><div style="height:3000px"></div>',
  );
  const send = await rawFingers(page);
  await send('touchStart', [{ x: 20, y: 400 }]);
  for (let d = 30; d <= 300; d += 30) await send('touchMove', [{ x: 20, y: 400 - d }]);
  await send('touchEnd');
  await expect.poll(async () => (await scroll(page)).y).toBeGreaterThan(0);
  await pinch(send, 187, 250);
  await expect.poll(() => zoom(page)).toBeGreaterThan(1);
});

for (const size of [PORTRAIT, LANDSCAPE]) {
  test(`pinches and drags on the bars do nothing at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const problems = await openGame(page);
    const box = await page.locator('#game canvas').boundingBox();
    expect(box.x).toBeGreaterThan(30);
    const bar = box.x / 2;
    const send = await rawFingers(page);

    await pinch(send, bar, size.height / 2);
    await dragDown(send, bar, 20);
    await pinch(send, box.x + box.width / 2, size.height / 2);
    await page.waitForTimeout(300);
    expect(await zoom(page)).toBe(1);
    expect(await scroll(page)).toEqual({ x: 0, y: 0 });
    expect(problems).toEqual([]);
  });
}

test('a long press opens no menu and selects nothing', async ({ page }) => {
  await page.setViewportSize(PORTRAIT);
  const problems = await openGame(page);
  await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    w.__menus = 0;
    // Bubbles up after the page's own listener, so it sees whether that one cancelled the menu.
    window.addEventListener('contextmenu', (e) => {
      if (!e.defaultPrevented) w.__menus++;
    });
  });
  const box = await page.locator('#game canvas').boundingBox();
  const send = await rawFingers(page);
  for (const x of [box.x / 2, box.x + box.width / 2]) {
    await send('touchStart', [{ x, y: 250 }]);
    await page.waitForTimeout(1200);
    await send('touchEnd');
  }

  // Browsers differ in whether a long press sends these, so send them too.
  const cancelled = await page.evaluate(() => {
    const fire = (type, target) => !target.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    const canvas = document.querySelector('canvas');
    return {
      menuOnCanvas: fire('contextmenu', canvas),
      menuOnBar: fire('contextmenu', document.body),
      select: fire('selectstart', document.body),
      dblclick: fire('dblclick', canvas),
      gesture: fire('gesturestart', document.body),
    };
  });
  expect(cancelled).toEqual({ menuOnCanvas: true, menuOnBar: true, select: true, dblclick: true, gesture: true });
  expect(await page.evaluate(() => /** @type {any} */ (window).__menus)).toBe(0);
  expect(await page.evaluate(() => document.getSelection()?.toString() ?? '')).toBe('');

  const style = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return {
      touchAction: s.touchAction,
      overscroll: s.overscrollBehaviorY,
      userSelect: s.userSelect || s.webkitUserSelect,
    };
  });
  expect(style).toEqual({ touchAction: 'none', overscroll: 'none', userSelect: 'none' });
  expect(problems).toEqual([]);
});

test('gestures and buttons still work on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const problems = await openGame(page);
  await startStopped(page, 'endless');
  await useTouch(page);
  const finger = await fingers(page);
  const { col, orientation } = (await matchState(page)).pair;

  await finger.press(187, 300);
  await finger.drag(40, 0);
  await advance(page, 2);
  await finger.lift();
  await advance(page, 2);
  expect((await matchState(page)).pair.col).toBe(col + 1);

  // The clockwise button, by its place in the layout.
  const at = await page.evaluate(() => {
    const b = /** @type {any} */ (window.__GAME__.scene.getScene('Match')).buttons.cw;
    return { x: b.x, y: b.y, width: window.__GAME__.scale.gameSize.width };
  });
  const box = await page.locator('#game canvas').boundingBox();
  const scale = box.width / at.width;
  await finger.press(box.x + at.x * scale, box.y + at.y * scale);
  await advance(page, 2);
  await finger.lift();
  expect((await matchState(page)).pair.orientation).not.toBe(orientation);
  expect(problems).toEqual([]);
});
