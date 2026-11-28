// `npm run package` (SA-31): builds this commit and writes release/splat-attack-<version>.tar.gz
// (the contents of dist/ at the archive root, the layout Arcade's game:install expects) and its
// .sha256 file (sha256sum format). No readiness checks: the release workflow runs this, and
// `npm run release:archive` runs it after its checks, so every archive is made the same way.
import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Builds and packages the game; returns the archive path and its SHA-256.
 * @returns {{ archive: string, sha256: string }}
 */
export function packageBuild() {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  const archive = `release/splat-attack-${version}.tar.gz`;

  execFileSync('npx', ['vite', 'build'], { stdio: 'inherit' });
  if (!existsSync('dist/index.html')) throw new Error('vite build did not produce dist/index.html');

  // Repeatable archive: fixed order, owners and timestamps (the commit time), and no name or time
  // in the gzip header, so the same commit built with the same tools gives the same bytes.
  let mtime = process.env.SOURCE_DATE_EPOCH;
  if (!mtime) {
    try {
      mtime = execFileSync('git', ['log', '-1', '--format=%ct'], { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch (_err) {
      mtime = '0';
    }
  }

  mkdirSync('release', { recursive: true });
  execSync(
    `set -o pipefail; tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=@${Number(mtime) || 0} ` +
      `-cf - -C dist . | gzip -n -9 > ${archive}`,
    { stdio: 'inherit', shell: '/bin/bash' },
  );

  const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
  writeFileSync(`${archive}.sha256`, `${sha256}  ${basename(archive)}\n`);
  return { archive, sha256 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { archive, sha256 } = packageBuild();
  console.log(`\nArchive: ${archive}\nSHA-256: ${sha256}`);
}
