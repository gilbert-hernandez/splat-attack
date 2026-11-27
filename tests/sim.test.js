import { describe, expect, it } from 'vitest';
import { checks, format, jobsFor, pairingsFor, parseArgs, runSim, summarize } from '../scripts/simCore.js';
import { SIM } from '../scripts/simConfig.js';
import { playMatch } from '../scripts/simMatch.js';

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
