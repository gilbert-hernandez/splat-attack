// `npm run release:archive`: builds this commit and writes release/splat-attack-<version>.tar.gz
// and its SHA-256. The commit must be ready to tag, or already tagged with its version.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { currentProblems, version } from './releaseState.js';

const problems = currentProblems(true);
if (problems.length > 0) {
  console.error(`Not ready to archive v${version}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const name = `splat-attack-${version}.tar.gz`;
execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
mkdirSync('release', { recursive: true });
execFileSync('tar', ['-czf', `release/${name}`, '-C', 'dist', '.']);
const hash = createHash('sha256')
  .update(readFileSync(`release/${name}`))
  .digest('hex');
writeFileSync(`release/${name}.sha256`, `${hash}  ${name}\n`);
console.log(`release/${name}\n${hash}`);
