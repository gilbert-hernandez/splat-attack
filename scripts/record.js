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

  // The route: title, a Ladder match with a pause, its result, then an Endless match.
  await openGame(page);
  await show();
  await startMatch(page, 'ladder');
  await show();
  await openPause(page);
  await show();
  await clickButton(page, 'Pause', 'resumeButton');
  await show();
  await page.keyboard.press('r');
  await waitForScene(page, 'Result');
  await show();
  await clickButton(page, 'Result', 'titleButton');
  await waitForScene(page, 'Title');
  await show(700);
  await startMatch(page, 'endless');
  await show();

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
