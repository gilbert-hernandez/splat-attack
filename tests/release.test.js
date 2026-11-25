import { describe, expect, it } from 'vitest';
import { compareVersions, newestChangelogVersion, releaseProblems } from '../scripts/release.js';

const ready = {
  version: '0.0.2',
  changelogVersion: '0.0.2',
  branch: 'master',
  clean: true,
  localTags: ['v0.0.1'],
  remoteTags: ['v0.0.1'],
};

describe('releaseProblems', () => {
  it('is empty when ready, including the first release', () => {
    expect(releaseProblems(ready)).toEqual([]);
    expect(releaseProblems({ ...ready, localTags: [], remoteTags: [] })).toEqual([]);
  });

  it.each([
    ['dirty tree', { clean: false }, /uncommitted/],
    ['wrong branch', { branch: 'sa-2' }, /sa-2, not master/],
    ['detached head', { branch: '' }, /detached/],
    ['changelog mismatch', { changelogVersion: '0.0.1' }, /newest version is 0\.0\.1/],
    ['changelog missing', { changelogVersion: null }, /missing/],
    ['tagged locally', { localTags: ['v0.0.2'] }, /already tagged locally/],
    ['tagged on origin', { remoteTags: ['v0.0.2'] }, /already tagged on origin/],
    ['origin unreachable', { remoteTags: null }, /couldn't read/],
    ['below the newest local tag', { localTags: ['v0.0.10'] }, /not above the newest tag, v0\.0\.10/],
    ['below the newest remote tag', { remoteTags: ['v0.1.0'] }, /not above the newest tag, v0\.1\.0/],
    ['bad version', { version: '0.2' }, /not x\.y\.z/],
  ])('%s', (_name, changes, message) => {
    const problems = releaseProblems({ ...ready, ...changes });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(message);
  });

  it('accepts its own tag only when it is on this commit', () => {
    const tagged = { ...ready, localTags: ['v0.0.2'], remoteTags: ['v0.0.2'] };
    expect(releaseProblems({ ...tagged, tagIsHere: true })).toEqual([]);
    expect(releaseProblems(tagged)).toHaveLength(2);
    expect(releaseProblems({ ...tagged, tagIsHere: true, clean: false })).toHaveLength(1);
  });

  it('lists every problem at once', () => {
    expect(releaseProblems({ ...ready, clean: false, branch: 'x', changelogVersion: null })).toHaveLength(3);
  });

  it('ignores tags that are not versions', () => {
    expect(releaseProblems({ ...ready, localTags: ['v9-old', 'demo'] })).toEqual([]);
  });
});

it('compares versions by number', () => {
  expect(compareVersions('0.0.10', '0.0.9')).toBeGreaterThan(0);
  expect(compareVersions('0.1.0', '0.0.9')).toBeGreaterThan(0);
  expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
});

it('reads the newest dated changelog version', () => {
  expect(newestChangelogVersion('## [Unreleased]\n\n## [0.2.0] - 2026-01-02\n## [0.1.0] - 2026-01-01')).toBe('0.2.0');
  expect(newestChangelogVersion('# Changelog')).toBeNull();
});
