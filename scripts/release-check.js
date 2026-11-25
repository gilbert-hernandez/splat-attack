// `npm run release:check`: is the current commit ready to tag? Changes nothing.
import { currentProblems, version } from './releaseState.js';

const problems = currentProblems(false);
if (problems.length > 0) {
  console.error(`Not ready to tag v${version}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log(`Ready: tag this commit v${version}`);
}
