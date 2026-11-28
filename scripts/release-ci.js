// Command line for .github/workflows/release.yml (SA-31). The rules are in release.js.
//
//   node scripts/release-ci.js check <tag>                  tag vs package.json + CHANGELOG section
//   node scripts/release-ci.js notes <version> <out>        write the CHANGELOG section for <version>
//   node scripts/release-ci.js decide <existing|-> <new>    print upload | skip | conflict (exit 1)
//   node scripts/release-ci.js arcade-notes <in> <version> <url> <sha256> <out>
//                                                           write <in> ending with the Install on Arcade block
import { readFileSync, writeFileSync } from 'node:fs';
import { arcadeBlock, changelogSection, checkTag, uploadDecision, withArcadeBlock } from './release.js';

/** @param {string} msg */
function fail(msg) {
  console.error(`::error::${msg}`);
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);

if (command === 'check') {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  const result = checkTag(args[0], version, readFileSync('CHANGELOG.md', 'utf8'));
  if ('error' in result) fail(result.error);
  else console.log(result.version);
} else if (command === 'notes') {
  const section = changelogSection(readFileSync('CHANGELOG.md', 'utf8'), args[0]);
  if (section === null) fail(`CHANGELOG.md has no "## [${args[0]}]" section.`);
  writeFileSync(args[1], `${section}\n`);
} else if (command === 'decide') {
  const existing = args[0] === '-' ? null : args[0];
  const decision = uploadDecision(existing, args[1]);
  console.log(decision);
  if (decision === 'conflict') {
    fail(
      `The attached archive (sha256 ${existing}) differs from this build (sha256 ${args[1]}). ` +
        'Published archives are never replaced; see "Releasing" in the README.',
    );
  }
} else if (command === 'arcade-notes') {
  const [input, version, url, sha256, out] = args;
  writeFileSync(out, withArcadeBlock(readFileSync(input, 'utf8'), arcadeBlock({ version, url, sha256 })));
} else {
  fail(`Unknown command "${command ?? ''}". Use check, notes, decide or arcade-notes.`);
}
