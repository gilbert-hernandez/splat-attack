// Record a gameplay video: `npm run record [-- out.webm]`. Needs `npm run dev` running.
// Writes videos/<timestamp>.webm (and .mp4 if ffmpeg is installed).
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';
import { clickButton, openGame, openPause, startMatch, waitForScene } from '../e2e/support.js';

const url = process.env.URL ?? 'http://localhost:5174';
const out = process.argv[2] ?? `videos/${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
const size = { width: 960, height: 540 };

try {
  await fetch(url);
} catch {
  console.error(`No dev server at ${url}. Start it with \`npm run dev\`, then run this again.`);
  process.exit(1);
}

mkdirSync('videos/.tmp', { recursive: true });
mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({
    baseURL: url,
    viewport: size,
    recordVideo: { dir: 'videos/.tmp', size },
  });
  const page = await context.newPage();
  const show = (ms = 1500) => page.waitForTimeout(ms);

  /** Plays the running match with scripts/greedy.js, or straight down, through the normal inputs. */
  const play = (greedy) =>
    page.evaluate(async (useGreedy) => {
      const url = '/scripts/greedy.js';
      const { greedyInput, planPair } = await import(/* @vite-ignore */ url);
      const { runner } = /** @type {any} */ (window.__GAME__.scene.getScene('Match'));
      let pairs = 0;
      let plan = null;
      runner.readInput = () => {
        const { state } = runner;
        if (state.phase !== 'falling') return 0;
        if (!useGreedy) return 16;
        if (pairs !== state.pairs) {
          pairs = state.pairs;
          plan = planPair(state);
        }
        // One input in four, so moves can be followed; drops are held.
        const input = greedyInput(state, plan);
        return input === 16 || state.tick % 4 === 0 ? input : 0;
      };
    }, greedy);

  // The route: title, an Endless match with a pause, a real top-out, the result and a new match.
  await openGame(page);
  await show();
  await startMatch(page, 'endless');
  await play(true);
  await show(10000);
  await openPause(page);
  await show();
  await clickButton(page, 'Pause', 'resumeButton');
  await show(30000);
  await play(false);
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Result'), undefined, { timeout: 90000 });
  await show(3500);
  await page.keyboard.press('Enter');
  await waitForScene(page, 'UI');
  await play(true);
  await show(6000);

  const video = page.video();
  await context.close();
  renameSync(await video.path(), out);
} finally {
  await browser.close();
}
console.log(`video: ${out}`);

try {
  const mp4 = out.replace(/\.webm$/, '') + '.mp4';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mp4]);
  console.log(`video: ${mp4}`);
} catch {
  console.log('No .mp4: ffmpeg is missing or failed.');
}
