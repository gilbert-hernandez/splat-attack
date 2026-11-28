// `npm run sim`: headless bot-vs-bot versus matches on fixed seeds, reporting each pairing and
// checking that the rivals get stronger from rival1 to rival5.
//   --matches N   matches per pairing (default 100, or 20 with --quick)
//   --rivals 3,4  only these rivals: each against the one below it if listed, rival1 against sparring
//   --seed N      the first seed (default 1)
//   --workers N   worker threads (default up to 4)
//   --quick       20 matches per pairing, checking only that each rival wins more than half
//   --variety     each rival plays 200 bot seeds on one piece seed (--seed) against a fixed opponent,
//                 varied and plain, and is checked for distinct openings, overlap, strength and
//                 player-score bands. With --quick, only the first 8 pairs and the opening checks.
import {
  checks,
  format,
  formatVariety,
  parseArgs,
  runSim,
  summarize,
  summarizeVariety,
  varietyChecks,
} from './simCore.js';

const started = performance.now();
const options = parseArgs(process.argv.slice(2));
const records = await runSim(options);
let results;
if (options.variety) {
  const summary = summarizeVariety(records, options);
  results = varietyChecks(summary, options);
  console.log(formatVariety(summary, results, options));
} else {
  const summary = summarize(records, options);
  results = checks(summary, options);
  console.log(format(summary, results));
}
console.log(
  `\n${records.length} matches on ${options.workers} workers in ${((performance.now() - started) / 1000).toFixed(1)}s`,
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
