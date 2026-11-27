import { expect, test } from '@playwright/test';
import { openGame, startMatch, waitForScene, waitFrames } from './support.js';

/** The running match's rival: its number, the bot's id, the label's text, and the seed. */
const rival = (page) =>
  page.evaluate(() => {
    const match = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
    return {
      number: match.rival,
      bot: match.rivalBot?.profile.id ?? null,
      label: match.rivalText?.visible ? match.rivalText.text : null,
      seed: match.runner.replay?.seed ?? null,
    };
  });

async function press(page, code) {
  await page.keyboard.press(code);
  await waitFrames(page, 3);
}

/** Ends the match with a debug key (W wins, R loses) and waits for the result to take input. */
async function endMatch(page, code) {
  await press(page, code);
  await waitForScene(page, 'Result');
  await page.waitForFunction(() => /** @type {any} */ (window.__GAME__.scene.getScene('Result')).ready);
}

/** The result's mode line. */
const resultMode = (page) =>
  page.evaluate(() => {
    const texts = /** @type {any} */ (window.__GAME__.scene.getScene('Result')).children.list.filter(
      (c) => c.type === 'Text',
    );
    return texts.map((t) => t.text).find((t) => t.startsWith('LADDER'));
  });

async function playAgain(page) {
  await page.keyboard.press('Enter');
  await waitForScene(page, 'UI');
  await waitFrames(page);
}

test('Ladder climbs the rivals on wins, repeats on a loss, and the result names the rival', async ({ page }) => {
  const problems = await openGame(page);
  await startMatch(page, 'ladder');
  expect(await rival(page)).toMatchObject({ number: 1, bot: 'rival1', label: 'RIVAL 1 · ROOKIE' });

  await endMatch(page, 'KeyW');
  expect(await resultMode(page)).toBe('LADDER · RIVAL 1 · ROOKIE');
  await playAgain(page);
  expect(await rival(page)).toMatchObject({ number: 2, bot: 'rival2', label: 'RIVAL 2 · RUSHER' });

  await endMatch(page, 'KeyR');
  await playAgain(page);
  expect(await rival(page)).toMatchObject({ number: 2, bot: 'rival2' });

  await endMatch(page, 'KeyW');
  await playAgain(page);
  expect(await rival(page)).toMatchObject({ number: 3, bot: 'rival3', label: 'RIVAL 3 · PAINTER' });

  // V steps to rival 5; beating it goes back to rival 1.
  for (let i = 0; i < 2; i++) await press(page, 'KeyV');
  expect(await rival(page)).toMatchObject({ number: 5, bot: 'rival5', label: 'RIVAL 5 · ACE' });
  await endMatch(page, 'KeyW');
  await playAgain(page);
  expect(await rival(page)).toMatchObject({ number: 1, bot: 'rival1' });

  // Back to the title resets the climb.
  await press(page, 'KeyV');
  await endMatch(page, 'KeyW');
  await page.keyboard.press('Escape');
  await waitForScene(page, 'Title');
  await waitFrames(page);
  await startMatch(page, 'ladder');
  expect(await rival(page)).toMatchObject({ number: 1, bot: 'rival1' });
  expect(problems).toEqual([]);
});

test('V moves to the next rival with a new seed, and wraps; it does nothing in Endless', async ({ page }) => {
  const problems = await openGame(page);
  await startMatch(page, 'ladder');
  const seeds = new Set([(await rival(page)).seed]);
  for (let n = 2; n <= 5; n++) {
    await press(page, 'KeyV');
    const now = await rival(page);
    expect(now).toMatchObject({ number: n, bot: `rival${n}` });
    seeds.add(now.seed);
  }
  await press(page, 'KeyV');
  expect(await rival(page)).toMatchObject({ number: 1, bot: 'rival1', label: 'RIVAL 1 · ROOKIE' });
  expect(seeds.size).toBe(5);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => /** @type {any} */ (window.__GAME__.scene.getScene('Pause'))?.ready);
  await page.evaluate(() => /** @type {any} */ (window.__GAME__.scene.getScene('Pause')).quit());
  await waitForScene(page, 'Title');
  await startMatch(page, 'endless');
  const before = await rival(page);
  await press(page, 'KeyV');
  expect(await rival(page)).toEqual(before);
  expect(before).toMatchObject({ bot: null, label: null });
  expect(problems).toEqual([]);
});

test('the CPU rival plays its board in a running Ladder match', async ({ page }) => {
  const problems = await openGame(page);
  await startMatch(page, 'ladder');
  await page.evaluate(() => {
    /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.rate = 8;
  });
  await page.waitForFunction(() => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.rival.pairs > 6);
  const placed = await page.evaluate(
    () => /** @type {any} */ (window.__GAME__.scene.getScene('Match')).runner.rival.grid.filter(Boolean).length,
  );
  expect(placed).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test.describe('portrait', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the label uses its short form', async ({ page }) => {
    await openGame(page);
    await startMatch(page, 'ladder');
    expect((await rival(page)).label).toBe('#1 ROOKIE');
  });
});
