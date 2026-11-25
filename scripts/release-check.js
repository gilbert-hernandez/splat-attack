// `npm run release:check`: is the current commit ready to tag? Changes nothing.
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

const { version } = JSON.parse(read('package.json'));
const problems = releaseProblems({
  version,
  changelogVersion: newestChangelogVersion(read('CHANGELOG.md')),
  branch: git('branch', '--show-current'),
  clean: git('status', '--porcelain') === '',
  localTags: lines(git('tag')),
  remoteTags: remoteTags(),
});

if (problems.length > 0) {
  console.error(`Not ready to tag v${version}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log(`Ready: tag this commit v${version}`);
}
