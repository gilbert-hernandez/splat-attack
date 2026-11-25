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
  startMatch,
  startStopped,
  waitForScene,
  waitFrames,
} from './support.js';

const LANDSCAPE = { width: 960, height: 540 };
const PORTRAIT = { width: 375, height: 667 };
const TALL = { width: 390, height: 844 };

const isActive = (page, key) => page.evaluate((k) => window.__GAME__.scene.isActive(k), key);

/** Resize the window and wait until the game has the size for it. */
async function resize(page, size, [width, height]) {
  await page.setViewportSize(size);
  await page.waitForFunction(
    ([w, h]) => window.__GAME__.scale.gameSize.width === w && window.__GAME__.scale.gameSize.height === h,
    [width, height],
  );
  await waitFrames(page);
}
const toPortrait = (page) => resize(page, PORTRAIT, [360, 640]);
const toLandscape = (page) => resize(page, LANDSCAPE, [960, 540]);

/** Visible objects of a scene that aren't wholly on screen. */
const offScreen = (page, key) =>
  page.evaluate((k) => {
    const { width, height } = window.__GAME__.scale.gameSize;
    const all = (objects) =>
      objects.flatMap((/** @type {any} */ o) => (o.list ? all(o.list) : o.visible && o.getBounds ? [o] : []));
    return all(window.__GAME__.scene.getScene(k).children.list)
      .map((o) => ({ what: o.text ?? o.texture?.key ?? o.type, b: o.getBounds() }))
      .filter(({ b }) => b.left < 0 || b.top < 0 || b.right > width || b.bottom > height)
      .map(({ what, b }) => `${what} ${b.left},${b.top} to ${b.right},${b.bottom}`);
  }, key);

/** What identifies the running match, and whether it's the same one. */
const match = (page) =>
  page.evaluate(() => {
    const { runner, view, rivalView, pauseOpen, keys, mode } = /** @type {any} */ (
      window.__GAME__.scene.getScene('Match')
    );
    const bounds = (o) => {
      const { x, y, width, height } = o.getBounds();
      return [x, y, width, height];
    };
    const boards = [view, rivalView]
      .filter(Boolean)
      .map((v) => ({ frame: bounds(v.frame), cells: bounds(v.fill), next: v.nextBoxes.map(bounds) }));
    return { mode, pauseOpen, boards, held: keys.held.slice(), replay: structuredClone(runner.replay) };
  });

const pauseReady = (page) =>
  page.waitForFunction(() => {
    const { scene } = window.__GAME__;
    return scene.isActive('Pause') && /** @type {any} */ (scene.getScene('Pause')).ready;
  });

for (const size of [PORTRAIT, TALL, { width: 844, height: 390 }, LANDSCAPE]) {
  test(`title to result and play again at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const problems = await openGame(page);
    const check = async (key) => expect(await offScreen(page, key), key).toEqual([]);
    await check('Title');
    await clickButton(page, 'Title', 'startButton');
    await waitForScene(page, 'ModeSelect');
    await waitFrames(page);
    await check('ModeSelect');
    await clickButton(page, 'ModeSelect', 'backButton');
    await waitForScene(page, 'Title');
    await waitFrames(page);
    for (const mode of ['ladder', 'endless']) {
      await startStopped(page, mode);
      await advance(page, 60);
      await waitFrames(page);
      await check('Match');
      await check('UI');
      await openPause(page);
      await check('Pause');
      if (mode === 'endless') break;
      await clickButton(page, 'Pause', 'quitButton');
      await waitForScene(page, 'Title');
      await waitFrames(page);
    }
    await clickButton(page, 'Pause', 'resumeButton');
    await page.waitForFunction(() => window.__GAME__.scene.isActive('Match'));
    await advanceToEnd(page);
    await waitFrames(page);
    await check('Match');
    await advance(page, 60, 0);
    await waitForScene(page, 'Result');
    await waitFrames(page);
    await check('Result');
    await clickButton(page, 'Result', 'againButton');
    await waitForScene(page, 'UI');
    await waitFrames(page);
    expect((await matchState(page)).pairs).toBe(1);
    await page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).finish());
    await waitForScene(page, 'Result');
    await waitFrames(page);
    await clickButton(page, 'Result', 'titleButton');
    await waitForScene(page, 'Title');
    expect(problems).toEqual([]);
  });
}

test('portrait Ladder: the board, next pairs and a half-size rival', async ({ page }) => {
  await page.setViewportSize(PORTRAIT);
  await openGame(page);
  await startStopped(page, 'ladder');
  expect((await match(page)).boards).toEqual([
    {
      frame: [0, 84, 240, 400],
      cells: [8, 92, 224, 384],
      next: [
        [268, 84, 64, 96],
        [268, 184, 64, 96],
      ],
    },
    { frame: [240, 284, 120, 200], cells: [244, 288, 112, 192], next: [] },
  ]);
  await advance(page, 30);
  const [pivot] = await drawn(page, 'pair');
  expect(pivot.x).toBe(8 + 3 * 32);
  expect((await drawn(page, 'next')).every((s) => s.x === 268 + 16)).toBe(true);
});

test('portrait Endless: the board and next pairs are centered', async ({ page }) => {
  await page.setViewportSize(TALL);
  await openGame(page);
  await startStopped(page, 'endless');
  const { boards } = await match(page);
  expect(boards).toHaveLength(1);
  expect(boards[0].frame).toEqual([24, 84, 240, 400]);
  expect(boards[0].next[1]).toEqual([272, 184, 64, 96]);
});

test('a half-size board draws its pieces at half size', async ({ page }) => {
  await page.setViewportSize(PORTRAIT);
  await openGame(page);
  await startStopped(page, 'ladder');
  const sprites = await page.evaluate(() => {
    const { rivalView, runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    runner.advance(10);
    rivalView.show(runner.state);
    return rivalView.pools.pair.active().map((s) => [s.x, s.displayWidth, s.y + s._crop.y * (s.isCropped ? 0.5 : 0)]);
  });
  expect(sprites).toHaveLength(2);
  for (const [x, width, top] of sprites) {
    expect([x, width]).toEqual([244 + 3 * 16, 16]);
    expect(top).toBeGreaterThanOrEqual(288);
  }
});

test('menus move to the new layout without restarting', async ({ page }) => {
  const problems = await openGame(page);
  const button = (key, name) => page.evaluate(([k, n]) => window.__GAME__.scene.getScene(k)[n].x, [key, name]);
  // An object made by create would be new after a restart.
  const marked = (key, name) => page.evaluate(([k, n]) => window.__GAME__.scene.getScene(k)[n].marked, [key, name]);
  for (const [key, name, next] of [
    ['Title', 'startButton', () => page.keyboard.press('Enter')],
    ['ModeSelect', 'endlessButton', () => Promise.resolve()],
  ]) {
    await waitForScene(page, key);
    await waitFrames(page);
    await page.evaluate(([k, n]) => void (window.__GAME__.scene.getScene(k)[n].marked = true), [key, name]);
    await toPortrait(page);
    expect([await button(key, name), await marked(key, name)]).toEqual([180, true]);
    expect(await offScreen(page, key)).toEqual([]);
    await toLandscape(page);
    expect([await button(key, name), await marked(key, name)]).toEqual([480, true]);
    await next();
  }
  expect(problems).toEqual([]);
});

test('the result keeps its content through a rotation, and its buttons work', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  await advanceToEnd(page);
  await advance(page, 60, 0);
  await waitForScene(page, 'Result');
  const texts = () =>
    page.evaluate(() => {
      const { scoreText, statTexts } = /** @type {any} */ (window.__GAME__.scene.getScene('Result'));
      return [scoreText, ...statTexts].map((t) => t.text);
    });
  const before = await texts();
  await toPortrait(page);
  expect(await texts()).toEqual(before);
  expect(await offScreen(page, 'Result')).toEqual([]);
  await clickButton(page, 'Result', 'titleButton');
  await waitForScene(page, 'Title');
});

test('a press held through a rotation does nothing', async ({ page }) => {
  await openGame(page);
  const center = async () => {
    const box = await page.locator('#game canvas').boundingBox();
    const at = await page.evaluate(() => {
      const { x, y } = /** @type {any} */ (window.__GAME__.scene.getScene('Title')).startButton;
      return [x / window.__GAME__.scale.gameSize.width, y / window.__GAME__.scale.gameSize.height];
    });
    return /** @type {[number, number]} */ ([box.x + at[0] * box.width, box.y + at[1] * box.height]);
  };
  const armed = () =>
    page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Title')).startButton.armed);
  await page.mouse.move(...(await center()));
  await waitFrames(page, 2);
  await page.mouse.down();
  await waitFrames(page, 2);
  expect(await armed()).toBe(true);
  await toPortrait(page);
  expect(await armed()).toBe(false);
  await page.mouse.move(...(await center()));
  await waitFrames(page, 2);
  await page.mouse.up();
  await waitFrames(page, 10);
  expect(await isActive(page, 'Title')).toBe(true);
});

for (const [name, from, to, x] of /** @type {[string, any, any, number][]} */ ([
  ['portrait', toLandscape, toPortrait, 8],
  ['landscape', toPortrait, toLandscape, 64],
])) {
  test(`rotating to ${name} mid-match keeps the match and pauses it`, async ({ page }) => {
    const problems = await openGame(page);
    await from(page);
    await startStopped(page, 'ladder', 7);
    await advance(page, 100, 16);
    while ((await matchState(page)).phase !== 'falling') await advance(page, 1, 0);
    await holdKey(page, 'KeyA');
    const state = await matchState(page);
    const { replay } = await match(page);
    await page.evaluate(() => {
      /** @type {any} */ (window.__GAME__.scene.getScene('Match')).view.frame.marked = true;
    });
    await to(page);
    await pauseReady(page);
    expect(await matchState(page)).toEqual(state);
    const after = await match(page);
    expect(after).toMatchObject({ pauseOpen: true, held: [], replay, mode: 'ladder' });
    expect(after.boards[0].cells[0]).toBe(x);
    // Drawn in its new place under Pause, and the same objects.
    for (const blob of await drawn(page, 'blobs')) expect((blob.x - x) % 32).toBe(0);
    expect((await drawn(page, 'pair')).every((s) => s.x >= x && s.x < x + 224)).toBe(true);
    const same = await page.evaluate(
      () => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).view.frame.marked,
    );
    expect(same).toBe(true);
    for (const key of ['Pause', 'Match', 'UI']) expect(await offScreen(page, key), key).toEqual([]);

    await page.evaluate(() => {
      /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.manual = false;
    });
    await clickButton(page, 'Pause', 'resumeButton');
    await page.waitForFunction(
      (t) => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.state.tick > t,
      state.tick,
    );
    expect(problems).toEqual([]);
  });
}

test('rotating while paused keeps the same Pause', async ({ page }) => {
  await openGame(page);
  await startMatch(page, 'endless');
  await openPause(page);
  const { tick } = await matchState(page);
  await page.evaluate(() => {
    /** @type {any} */ (window.__GAME__.scene.getScene('Pause')).resumeButton.marked = true;
  });
  await toPortrait(page);
  await toLandscape(page);
  await toPortrait(page);
  const resume = await page.evaluate(() => {
    const { resumeButton } = /** @type {any} */ (window.__GAME__.scene.getScene('Pause'));
    return [resumeButton.marked, resumeButton.x];
  });
  expect(resume).toEqual([true, 180]);
  expect((await match(page)).boards[0].frame[0]).toBe(24);
  expect((await matchState(page)).tick).toBe(tick);
  await clickButton(page, 'Pause', 'resumeButton');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Match'));
  await waitFrames(page);
  expect(await isActive(page, 'Pause')).toBe(false);
});

test('rotating during GAME OVER pauses, and the result still comes', async ({ page }) => {
  await openGame(page);
  await startStopped(page, 'endless');
  await advanceToEnd(page);
  await toPortrait(page);
  await pauseReady(page);
  expect(await offScreen(page, 'Match')).toEqual([]);
  await page.evaluate(() => {
    /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.manual = false;
  });
  await clickButton(page, 'Pause', 'resumeButton');
  await waitForScene(page, 'Result');
  expect(await offScreen(page, 'Result')).toEqual([]);
});

test('a height change re-lays out without pausing', async ({ page }) => {
  await page.setViewportSize(TALL);
  await openGame(page);
  await startMatch(page, 'endless');
  const hintY = () =>
    page.evaluate(() => {
      const { children } = window.__GAME__.scene.getScene('Match');
      return /** @type {any} */ (children.list.find((/** @type {any} */ o) => o.text?.startsWith('1-5'))).y;
    });
  const changes = await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    w.__changes = 0;
    window.__GAME__.registry.get('layout').listeners.add(() => w.__changes++);
    return w.__changes;
  });
  expect(changes).toBe(0);
  const before = await hintY();
  await resize(page, { width: 390, height: 760 }, [360, 700]);
  expect(await hintY()).toBe(before - 78);
  expect(await page.evaluate(() => /** @type {any} */ (window).__changes)).toBe(1);
  const { tick } = await matchState(page);
  await page.waitForFunction(
    (t) => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.state.tick > t,
    tick,
  );
  expect(await isActive(page, 'Pause')).toBe(false);
});

test('the title and result use the art for the orientation', async ({ page }) => {
  await openGame(page);
  // As if the art had been delivered.
  await page.evaluate(() => window.__GAME__.registry.set('placeholders', []));
  const keys = () =>
    page.evaluate(() => {
      const { background, logo } = /** @type {any} */ (window.__GAME__.scene.getScene('Title'));
      return [background?.texture.key, logo.texture.key];
    });
  await toPortrait(page);
  expect(await keys()).toEqual(['ui_title_bg_portrait', 'ui_logo_portrait']);
  await toLandscape(page);
  expect(await keys()).toEqual(['ui_title_bg', 'ui_logo']);
  await startStopped(page, 'endless');
  await page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).finish());
  await waitForScene(page, 'Result');
  await waitFrames(page);
  await toPortrait(page);
  const panels = await page.evaluate(() =>
    window.__GAME__.scene
      .getScene('Result')
      .children.list.map((/** @type {any} */ o) => o.texture?.key)
      .filter((key) => key?.includes('panel')),
  );
  expect(panels).toEqual(['ui_result_panel_portrait']);
});
