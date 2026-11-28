import { describe, expect, it } from 'vitest';
import {
  checks,
  distinctOpenings,
  format,
  formatVariety,
  jobsFor,
  openingOverlap,
  pairingsFor,
  parseArgs,
  runSim,
  summarize,
  summarizeVariety,
  varietyChecks,
} from '../scripts/simCore.js';
import { SIM } from '../scripts/simConfig.js';
import { OPENING, playMatch, playVariety } from '../scripts/simMatch.js';

/** A report with the timings taken out, which differ from run to run. */
function untimed(records) {
  return records.map(({ a, b, ...rest }) => {
    const strip = ({ worstMs: _w, times: _t, ...side }) => side;
    return { ...rest, a: strip(a), b: strip(b) };
  });
}

describe('npm run sim', () => {
  it('reads its options', () => {
    expect(parseArgs([])).toMatchObject({ matches: SIM.matches, rivals: [1, 2, 3, 4, 5], seed: 1, quick: false });
    expect(parseArgs(['--quick'])).toMatchObject({ matches: SIM.quickMatches, quick: true });
    expect(parseArgs(['--rivals', '4,3', '--matches', '40', '--seed', '9'])).toMatchObject({
      rivals: [3, 4],
      matches: 40,
      seed: 9,
    });
    expect(() => parseArgs(['--rivals', '7'])).toThrow('no rival 7');
    expect(() => parseArgs(['--matches', '0'])).toThrow('--matches');
    expect(() => parseArgs(['--fast'])).toThrow('Unknown option: --fast');
  });

  it('pairs each rival with the one below it, and rival1 with the sparring rival', () => {
    expect(pairingsFor([1, 2, 3, 4, 5])).toEqual([
      { a: 'rival1', b: 'sparring' },
      { a: 'rival2', b: 'rival1' },
      { a: 'rival3', b: 'rival2' },
      { a: 'rival4', b: 'rival3' },
      { a: 'rival5', b: 'rival4' },
    ]);
    expect(pairingsFor([3, 4])).toEqual([{ a: 'rival4', b: 'rival3' }]);
    expect(pairingsFor([3, 5])).toEqual([]);
  });

  it('alternates sides by seed', () => {
    const jobs = jobsFor(parseArgs(['--rivals', '3,4', '--matches', '4']));
    expect(jobs.map((j) => [j.seed, j.side])).toEqual([
      [1, 0],
      [2, 1],
      [3, 0],
      [4, 1],
    ]);
  });

  it('counts a match still running at the tick limit as cut off', () => {
    const record = playMatch({ pairing: 0, a: 'rival2', b: 'rival1', seed: 1, side: 0 }, 300);
    expect(record.winner).toBe('cut');
    expect(record.ticks).toBe(300);
  });

  it(
    'reports every value, skips checks for pairings it did not play, and gives the same results on 1 or 4 workers',
    { timeout: 120000 },
    async () => {
      const options = parseArgs(['--quick', '--rivals', '1,2', '--matches', '4']);
      const one = await runSim({ ...options, workers: 1 });
      const four = await runSim({ ...options, workers: 4 });
      expect(one).toHaveLength(8);
      expect(untimed(four)).toEqual(untimed(one));
      const summary = summarize(one, options);
      const results = checks(summary, options);
      // Only the pairings played are checked.
      expect(results.map((r) => r.name)).toEqual(['rival1 vs sparring', 'rival2 vs rival1']);
      const text = format(summary, results);
      for (const column of ['win%', 'chain max', 'chain avg', 'score avg', 'score sd', 'attacks', 'gunk/atk']) {
        expect(text).toContain(column);
      }
      for (const column of ['stain/splat', 'rinses', 'bombs', 'units', 'p99.9 ms', 'worst ms', 'median']) {
        expect(text).toContain(column);
      }
      expect(text).toMatch(/(PASS|FAIL) {2}rival2 vs rival1: won [\d.]+%, needs more than 50%/);
    },
  );

  it('fails a pairing under the neighbor threshold, naming it', () => {
    const options = parseArgs(['--rivals', '2,3']);
    const side = /** @type {any} */ ({ wins: 59 });
    const results = checks(/** @type {any} */ ([{ a: 'rival3', b: 'rival2', sides: { a: side, b: side } }]), options);
    expect(results).toEqual([{ name: 'rival3 vs rival2', won: 59, rule: 'at least 60%', passed: false }]);
  });
});

describe('npm run sim -- --variety', () => {
  const opening = (...keys) => Array.from({ length: OPENING }, (_, i) => keys[i] ?? `k${i}`);

  it('reads its options', () => {
    expect(parseArgs(['--variety'])).toMatchObject({ variety: true, matches: SIM.variety.matches, seed: 1 });
    expect(parseArgs(['--variety', '--quick', '--seed', '2'])).toMatchObject({ variety: true, quick: true, seed: 2 });
  });

  it('measures distinct openings and overlap', () => {
    const same = [opening(), opening(), opening(), opening()];
    expect(distinctOpenings(same)).toBe(25);
    expect(openingOverlap(same)).toBe(100);
    const different = [0, 1, 2, 3].map((n) => Array.from({ length: OPENING }, (_, i) => `${n}-${i}`));
    expect(distinctOpenings(different)).toBe(100);
    expect(openingOverlap(different)).toBe(0);
    // Two openings sharing their first half.
    const half = [
      opening('a', 'b', 'c', 'd', 'x1', 'x2', 'x3', 'x4'),
      opening('a', 'b', 'c', 'd', 'y1', 'y2', 'y3', 'y4'),
    ];
    expect(distinctOpenings(half)).toBe(100);
    expect(openingOverlap(half)).toBe(50);
  });

  it('plays every match of a rival on the same pieces against the same opponent, changing only the bot seed', () => {
    const jobs = jobsFor(parseArgs(['--variety', '--rivals', '3', '--matches', '3']));
    expect(jobs).toHaveLength(6);
    expect(new Set(jobs.map((j) => j.pieceSeed))).toEqual(new Set([1]));
    expect(jobs.filter((j) => !j.plain).map((j) => j.botSeed)).toEqual([1000, 1001, 1002]);
    expect(jobs.filter((j) => j.plain).map((j) => j.botSeed)).toEqual([1000, 1001, 1002]);
    const colors = (record) =>
      record.opening.map((key) =>
        key
          .split(';')
          .map((c) => c.split(',')[2])
          .sort()
          .join(),
      );
    const a = playVariety({ rival: 3, pieceSeed: 1, botSeed: 1, plain: false, stopAfter: OPENING }, 36000);
    const b = playVariety({ rival: 3, pieceSeed: 1, botSeed: 2, plain: false, stopAfter: OPENING }, 36000);
    expect(colors(a)).toEqual(colors(b));
    expect(a.opening).toHaveLength(OPENING);
  });

  it(
    'a quick run reports both opening metrics, checks only those, and matches on 1 or 4 workers',
    { timeout: 120000 },
    async () => {
      const options = parseArgs(['--variety', '--quick', '--rivals', '1', '--matches', '6']);
      const one = await runSim({ ...options, workers: 1 });
      const four = await runSim({ ...options, workers: 4 });
      expect(one).toHaveLength(6);
      expect(four).toEqual(one);
      const summary = summarizeVariety(one, options);
      const results = varietyChecks(summary, options);
      expect(results.map((r) => r.name)).toEqual(['rival1 distinct openings', 'rival1 opening overlap']);
      const text = formatVariety(summary, results, options);
      for (const column of [
        'distinct%',
        'overlap%',
        'win%',
        'plain win%',
        'opp score',
        'opp sd',
        'opp/min',
        'switches',
      ]) {
        expect(text).toContain(column);
      }
    },
  );

  it('checks the strength and player-score bands against the plain baseline', () => {
    const side = (wins, opponentRate, opponentSpread) => ({
      matches: 200,
      wins,
      cut: 0,
      averageScore: 0,
      opponentScore: 0,
      opponentSpread,
      opponentRate,
      averageSeconds: 0,
    });
    const summary = [
      {
        rival: 4,
        distinct: 99,
        overlap: 20,
        varied: side(70, 1000, 100),
        plain: side(75, 1100, 90),
        plans: {},
        switches: 0,
      },
      {
        rival: 5,
        distinct: 90,
        overlap: 60,
        varied: side(60, 1500, 200),
        plain: side(75, 1000, 100),
        plans: {},
        switches: 0,
      },
    ];
    const results = varietyChecks(summary, parseArgs(['--variety']));
    const failed = results.filter((r) => !r.passed).map((r) => r.name);
    expect(failed).toEqual([
      'rival5 distinct openings',
      'rival5 opening overlap',
      'rival5 strength band',
      'rival5 player-score band',
      'rival5 player-score spread',
    ]);
  });
});
