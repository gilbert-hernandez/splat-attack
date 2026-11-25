import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { newestChangelogVersion } from '../scripts/release.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

it('the newest dated CHANGELOG version equals package.json', () => {
  const newest = newestChangelogVersion(read('CHANGELOG.md'));
  expect(newest, 'newest CHANGELOG.md version vs package.json').toBe(JSON.parse(read('package.json')).version);
});
