import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { versionLabel } from '../src/util/version.js';

describe('versionLabel', () => {
  it('is the plain version in production', () => {
    expect(versionLabel('0.2.0', '', false)).toBe('v0.2.0');
  });

  it('ignores the commit in production', () => {
    expect(versionLabel('0.2.0', '38aa0ce', false)).toBe('v0.2.0');
  });

  it('adds -dev and the commit in development', () => {
    expect(versionLabel('0.2.0', '38aa0ce', true)).toBe('v0.2.0-dev (38aa0ce)');
  });

  it('drops the commit in development when it is empty or blank', () => {
    expect(versionLabel('0.2.0', '', true)).toBe('v0.2.0-dev');
    expect(versionLabel('0.2.0', '  \n', true)).toBe('v0.2.0-dev');
  });
});

describe('injected build constants', () => {
  it('__APP_VERSION__ matches package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(__APP_VERSION__).toBe(pkg.version);
  });

  it('__APP_COMMIT__ is a string', () => {
    expect(typeof __APP_COMMIT__).toBe('string');
  });
});
