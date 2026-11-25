// Reads the repository for the release scripts. Changes nothing.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { newestChangelogVersion, releaseProblems } from './release.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 }).trim();
const lines = (text) => text.split('\n').filter(Boolean);

function remoteTags() {
  try {
    return lines(git('ls-remote', '--tags', '--refs', 'origin')).map((l) => l.split('refs/tags/')[1]);
  } catch {
    return null;
  }
}

export const { version } = JSON.parse(read('package.json'));

/** Where the version's tag points, or null: on origin when it's there, else locally. */
function tagCommit() {
  const tag = `refs/tags/v${version}`;
  try {
    // For an annotated tag, the ^{} line is the commit.
    const remote = lines(git('ls-remote', 'origin', tag, `${tag}^{}`)).at(-1);
    return remote ? remote.split('\t')[0] : git('rev-parse', '--verify', `${tag}^{commit}`);
  } catch {
    return null;
  }
}

/** @param {boolean} allowTagHere accept the version's tag if it points at this commit */
export function currentProblems(allowTagHere) {
  return releaseProblems({
    version,
    changelogVersion: newestChangelogVersion(read('CHANGELOG.md')),
    branch: git('branch', '--show-current'),
    clean: git('status', '--porcelain') === '',
    localTags: lines(git('tag')),
    remoteTags: remoteTags(),
    tagIsHere: allowTagHere && tagCommit() === git('rev-parse', 'HEAD'),
  });
}
