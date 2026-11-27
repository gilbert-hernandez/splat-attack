// `npm run sim`: options, pairings, matches across worker threads, the report and the pass checks.
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { RIVALS } from '../src/config/rivals.js';
import { CLOCK } from '../src/config/input.js';
import { SIM } from './simConfig.js';
import { BUCKET_MS } from './simMatch.js';

/**
 * @typedef {object} SimOptions
 * @property {number} matches per pairing
 * @property {number[]} rivals rival numbers taking part
 * @property {number} seed the first seed
 * @property {boolean} quick
 * @property {number} workers
 * @property {number} maxTicks
 * @property {{a: string, b: string}[]} [pairings] instead of the neighbor pairings (tests only)
 */

/**
 * Options from command-line arguments.
 * @param {string[]} args
 * @returns {SimOptions}
 */
export function parseArgs(args) {
  const value = (name) => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`${name} needs a value`);
    return next;
  };
  const known = new Set(['--matches', '--rivals', '--seed', '--workers', '--quick']);
  for (const arg of args) if (arg.startsWith('--') && !known.has(arg)) throw new Error(`Unknown option: ${arg}`);
  const quick = args.includes('--quick');
  const count = (name, fallback, min = 1) => {
    const raw = value(name);
    if (raw === undefined) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) throw new Error(`${name} must be an integer of at least ${min}`);
    return n;
  };
  const all = RIVALS.map((r) => r.number);
  const listed = value('--rivals');
  const rivals = listed === undefined ? all : listed.split(',').map(Number);
  for (const n of rivals) if (!all.includes(n)) throw new Error(`--rivals: no rival ${n}`);
  return {
    matches: count('--matches', quick ? SIM.quickMatches : SIM.matches),
    rivals: [...new Set(rivals)].sort((a, b) => a - b),
    seed: count('--seed', SIM.firstSeed, 0),
    quick,
    workers: count('--workers', Math.min(SIM.maxWorkers, availableParallelism())),
    maxTicks: SIM.maxTicks,
  };
}

/**
 * The pairings to play: rival1 against the sparring rival if rival1 takes part, and each rival
 * against the one below it when both take part. `a` is the stronger side.
 * @param {number[]} rivals
 * @returns {{a: string, b: string}[]}
 */
export function pairingsFor(rivals) {
  const list = [];
  for (const n of rivals) {
    if (n === 1) list.push({ a: 'rival1', b: 'sparring' });
    else if (rivals.includes(n - 1)) list.push({ a: `rival${n}`, b: `rival${n - 1}` });
  }
  return list;
}

/** Every match to play, in a fixed order: by pairing, then seed. Sides alternate by seed. */
export function jobsFor(options) {
  // Tests may pass their own pairings; the CLI always pairs neighbors.
  return (options.pairings ?? pairingsFor(options.rivals)).flatMap(({ a, b }, pairing) =>
    Array.from({ length: options.matches }, (_, i) => ({ pairing, a, b, seed: options.seed + i, side: i % 2 })),
  );
}

/**
 * Plays every match across worker threads.
 * @param {SimOptions} options
 * @returns {Promise<import('./simMatch.js').MatchRecord[]>} in job order, whatever the worker count
 */
export async function runSim(options) {
  const jobs = jobsFor(options);
  const workers = Math.max(1, Math.min(options.workers, jobs.length));
  // Deal the jobs round-robin, so each worker gets a mix of pairings.
  const shares = Array.from({ length: workers }, (_, w) => jobs.filter((_, i) => i % workers === w));
  const results = await Promise.all(
    shares.map(
      (share) =>
        new Promise((resolve, reject) => {
          const worker = new Worker(new URL('./simWorker.js', import.meta.url), {
            workerData: { jobs: share, maxTicks: options.maxTicks },
          });
          worker.once('message', resolve);
          worker.once('error', reject);
        }),
    ),
  );
  return results.flat().sort((x, y) => x.pairing - y.pairing || x.seed - y.seed);
}

const percent = (part, whole) => (whole === 0 ? 0 : (100 * part) / whole);
const average = (list) => (list.length === 0 ? 0 : list.reduce((s, v) => s + v, 0) / list.length);
const median = (list) => {
  const sorted = [...list].sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const spread = (list) => {
  const mean = average(list);
  return Math.sqrt(average(list.map((v) => (v - mean) ** 2)));
};

/** The time (the top of its bucket) that a fraction of all calls took at most. */
function quantile(histograms, fraction) {
  const total = histograms.reduce((sum, h) => sum.map((n, i) => n + h[i]));
  const calls = total.reduce((s, n) => s + n, 0);
  let seen = 0;
  for (let i = 0; i < total.length; i++) {
    seen += total[i];
    if (seen >= calls * fraction) return (i + 1) * BUCKET_MS;
  }
  return total.length * BUCKET_MS;
}

/** One side's numbers over a pairing's matches. */
function sideSummary(records, key) {
  const sides = records.map((r) => r[key]);
  const attacks = sides.reduce((s, b) => s + b.attacks, 0);
  const splats = sides.reduce((s, b) => s + b.splats, 0);
  const units = sides.map((b) => b.maxUnits).filter((u) => u !== null);
  return {
    wins: percent(records.filter((r) => r.winner === key).length, records.length),
    longestChain: Math.max(0, ...sides.map((b) => b.longestChain)),
    averageLongestChain: average(sides.map((b) => b.longestChain)),
    averageScore: average(sides.map((b) => b.score)),
    scoreSpread: spread(sides.map((b) => b.score)),
    attacksPerMatch: average(sides.map((b) => b.attacks)),
    gunkPerAttack: attacks === 0 ? 0 : sides.reduce((s, b) => s + b.gunk, 0) / attacks,
    stainsPerSplat: splats === 0 ? 0 : sides.reduce((s, b) => s + b.stainMatches, 0) / splats,
    rinsesPerMatch: average(sides.map((b) => b.rinses)),
    bombsPerMatch: average(sides.map((b) => b.bombs)),
    worstUnits: units.length === 0 ? null : Math.max(...units),
    worstMs: Math.max(0, ...sides.map((b) => b.worstMs)),
    p999Ms: quantile(
      sides.map((b) => b.times),
      0.999,
    ),
  };
}

/**
 * Each pairing's numbers.
 * @param {import('./simMatch.js').MatchRecord[]} records
 * @param {SimOptions} options
 */
export function summarize(records, options) {
  return pairingsFor(options.rivals).map(({ a, b }, pairing) => {
    const mine = records.filter((r) => r.pairing === pairing);
    const seconds = mine.map((r) => r.ticks / CLOCK.ticksPerSecond);
    return {
      a,
      b,
      matches: mine.length,
      draws: percent(mine.filter((r) => r.winner === 'draw').length, mine.length),
      cut: percent(mine.filter((r) => r.winner === 'cut').length, mine.length),
      averageSeconds: average(seconds),
      medianSeconds: median(seconds),
      sides: { a: sideSummary(mine, 'a'), b: sideSummary(mine, 'b') },
    };
  });
}

/**
 * The pass checks for the pairings played, each with whether it passed.
 * @param {ReturnType<typeof summarize>} summary
 * @param {SimOptions} options
 */
export function checks(summary, options) {
  return summary.map(({ a, b, sides }) => {
    const baseline = b === 'sparring';
    let need = SIM.neighborPercent;
    let strict = false;
    if (options.quick) [need, strict] = [SIM.quickPercent, true];
    else if (baseline) [need, strict] = [SIM.baselinePercent, true];
    const won = sides.a.wins;
    const passed = strict ? won > need : won >= need;
    const rule = `${strict ? 'more than' : 'at least'} ${need}%`;
    return { name: `${a} vs ${b}`, won, rule, passed };
  });
}

/**
 * The report as text.
 * @param {ReturnType<typeof summarize>} summary
 * @param {ReturnType<typeof checks>} results
 */
export function format(summary, results) {
  const fixed = (n, digits = 1) => n.toFixed(digits);
  const header = [
    'bot',
    'win%',
    'chain max',
    'chain avg',
    'score avg',
    'score sd',
    'attacks',
    'gunk/atk',
    'stain/splat',
    'rinses',
    'bombs',
    'units',
    'p99.9 ms',
    'worst ms',
  ];
  const lines = [];
  for (const pairing of summary) {
    lines.push(
      `${pairing.a} vs ${pairing.b}: ${pairing.matches} matches, draws ${fixed(pairing.draws)}%, ` +
        `cut off ${fixed(pairing.cut)}%, length avg ${fixed(pairing.averageSeconds)}s, median ${fixed(pairing.medianSeconds)}s`,
    );
    const rows = [header];
    for (const key of ['a', 'b']) {
      const s = pairing.sides[key];
      rows.push([
        pairing[key],
        fixed(s.wins),
        String(s.longestChain),
        fixed(s.averageLongestChain, 2),
        fixed(s.averageScore, 0),
        fixed(s.scoreSpread, 0),
        fixed(s.attacksPerMatch),
        fixed(s.gunkPerAttack, 2),
        fixed(s.stainsPerSplat, 2),
        fixed(s.rinsesPerMatch, 2),
        fixed(s.bombsPerMatch, 2),
        s.worstUnits === null ? '-' : String(s.worstUnits),
        fixed(s.p999Ms, 2),
        fixed(s.worstMs, 2),
      ]);
    }
    const widths = header.map((_, i) => Math.max(...rows.map((row) => row[i].length)));
    for (const row of rows) lines.push(`  ${row.map((cell, i) => cell.padStart(widths[i])).join('  ')}`);
    lines.push('');
  }
  if (results.length === 0) lines.push('No pass checks for these pairings.');
  for (const r of results)
    lines.push(`${r.passed ? 'PASS' : 'FAIL'}  ${r.name}: won ${fixed(r.won)}%, needs ${r.rule}`);
  return lines.join('\n');
}
