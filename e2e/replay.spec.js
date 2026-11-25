import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openGame } from './support.js';

// The engine must give the same results in a browser as in Node.
const DIR = new URL('../tests/core/replays/', import.meta.url);

for (const file of readdirSync(DIR)) {
  const { replay, expected } = JSON.parse(readFileSync(new URL(file, DIR), 'utf8'));
  test(`replays ${file} as in Node`, async ({ page }) => {
    await openGame(page);
    const actual = await page.evaluate(async (data) => {
      const url = '/scripts/replayResult.js';
      const { replayResult } = await import(/* @vite-ignore */ url);
      return replayResult(data);
    }, replay);
    expect(actual).toEqual(expected);
  });
}
