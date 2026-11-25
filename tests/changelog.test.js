import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

it('the newest dated CHANGELOG version equals package.json', () => {
  const newest = read('CHANGELOG.md').match(/^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/m)?.[1];
  expect(newest, 'newest CHANGELOG.md version vs package.json').toBe(JSON.parse(read('package.json')).version);
});
