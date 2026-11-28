// `npm run release:archive`: builds this commit and writes release/splat-attack-<version>.tar.gz
// and its SHA-256, with the same packaging as the release workflow (scripts/package.js). The
// commit must be ready to tag, or already tagged with its version.
import { packageBuild } from './package.js';
import { currentProblems, version } from './releaseState.js';

const problems = currentProblems(true);
if (problems.length > 0) {
  console.error(`Not ready to archive v${version}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const { archive, sha256 } = packageBuild();
console.log(`${archive}\n${sha256}`);
