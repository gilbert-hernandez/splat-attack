import { describe, expect, it } from 'vitest';
import {
  arcadeBlock,
  BLOCK_END,
  BLOCK_START,
  changelogSection,
  checkTag,
  compareVersions,
  newestChangelogVersion,
  releaseProblems,
  uploadDecision,
  versionFromTag,
  withArcadeBlock,
} from '../scripts/release.js';

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

const changelog = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '- Not yet',
  '',
  '## [0.1.10] - 2026-11-28',
  '',
  '### Added',
  '',
  '- Release workflow',
  '',
  '## [0.1.1] - 2026-11-25',
  '',
  '- Touch',
  '',
  '[0.1.1]: https://example.com/v0.1.1',
].join('\n');

describe('versionFromTag', () => {
  it.each([
    ['v0.1.10', '0.1.10'],
    ['v1.2.3', '1.2.3'],
    ['v1.2', null],
    ['demo-test', null],
    ['0.1.10', null],
    ['', null],
  ])('%s', (tag, version) => {
    expect(versionFromTag(tag)).toBe(version);
  });
});

describe('changelogSection', () => {
  it('reads a middle section without its heading', () => {
    expect(changelogSection(changelog, '0.1.10')).toBe('### Added\n\n- Release workflow');
  });

  it('stops the last section at the link references', () => {
    expect(changelogSection(changelog, '0.1.1')).toBe('- Touch');
  });

  it('does not match a prefix of another version or a missing one', () => {
    expect(changelogSection('## [0.1.10] - 2026-11-28\n\n- x', '0.1.1')).toBeNull();
    expect(changelogSection(changelog, '0.2.0')).toBeNull();
  });

  it('reads CRLF files', () => {
    expect(changelogSection(changelog.replace(/\n/g, '\r\n'), '0.1.1')).toBe('- Touch');
  });
});

describe('checkTag', () => {
  it('accepts a matching tag with a changelog section', () => {
    expect(checkTag('v0.1.10', '0.1.10', changelog)).toEqual({ ok: true, version: '0.1.10' });
  });

  it('names both versions on a mismatch', () => {
    const result = checkTag('v0.1.11', '0.1.10', changelog);
    expect(result.ok).toBe(false);
    expect('error' in result && result.error).toMatch(/0\.1\.11.*0\.1\.10/);
  });

  it('fails without a changelog section', () => {
    const result = checkTag('v0.2.0', '0.2.0', changelog);
    expect('error' in result && result.error).toMatch(/no "## \[0\.2\.0\]" section/);
  });

  it('fails on a tag that is not a version', () => {
    expect(checkTag('demo-test', '0.1.10', changelog).ok).toBe(false);
  });
});

describe('Install on Arcade block', () => {
  const block = arcadeBlock({ version: '0.1.10', url: 'https://x/a.tar.gz', sha256: 'abc' });
  const count = (/** @type {string} */ text) => text.split(BLOCK_START).length - 1;

  it('gives the games.php values between markers', () => {
    expect(block.startsWith(BLOCK_START)).toBe(true);
    expect(block.endsWith(BLOCK_END)).toBe(true);
    expect(block).toContain("'version' => '0.1.10',");
    expect(block).toContain("'download_url' => 'https://x/a.tar.gz',");
    expect(block).toContain("'sha256' => 'abc',");
  });

  it('is appended to notes, or is the notes when empty', () => {
    expect(withArcadeBlock('- Notes\n', block)).toBe(`- Notes\n\n${block}\n`);
    expect(withArcadeBlock('', block)).toBe(`${block}\n`);
  });

  it('is replaced, never repeated, and moved to the end', () => {
    const old = arcadeBlock({ version: '0.1.9', url: 'u', sha256: 'old' });
    const notes = withArcadeBlock(`- Notes\r\n\r\n${old}\r\n\r\nAfter`, block);
    expect(count(notes)).toBe(1);
    expect(notes).not.toContain('old');
    expect(notes).toBe(`- Notes\n\nAfter\n\n${block}\n`);
    expect(withArcadeBlock(notes, block)).toBe(notes);
  });
});

it.each([
  [null, 'abc', 'upload'],
  ['', 'abc', 'upload'],
  ['abc', 'abc', 'skip'],
  ['ABC', 'abc', 'skip'],
  ['abc', 'def', 'conflict'],
])('upload decision: attached %s, new %s → %s', (existing, next, decision) => {
  expect(uploadDecision(existing, next)).toBe(decision);
});
