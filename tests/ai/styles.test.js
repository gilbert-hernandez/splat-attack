import { describe, expect, it } from 'vitest';
import { parseArgs, runSim } from '../../scripts/simCore.js';

// Each rival plays the same 20 seeded matches against the sparring rival; their styles must show.
describe('rival styles', () => {
  const ids = ['rival1', 'rival2', 'rival3', 'rival4'];
  /** @type {Record<string, {attacks: number, gunk: number, chains: number, stains: number, splats: number, matches: number}>} */
  const totals = {};

  it('play 20 matches each against sparring', { timeout: 300000 }, async () => {
    const options = { ...parseArgs(['--matches', '20']), workers: 4 };
    const records = await runSim({ ...options, pairings: ids.map((a) => ({ a, b: 'sparring' })) });
    for (const id of ids) totals[id] = { attacks: 0, gunk: 0, chains: 0, stains: 0, splats: 0, matches: 0 };
    for (const record of records) {
      const side = record.a;
      const t = totals[ids[record.pairing]];
      t.attacks += side.attacks;
      t.gunk += side.gunk;
      t.chains += side.longestChain;
      t.stains += side.stainMatches;
      t.splats += side.splats;
      t.matches++;
    }
    expect(ids.map((id) => totals[id].matches)).toEqual([20, 20, 20, 20]);
  });

  it('the Rusher sends more, smaller attacks than the Builder', () => {
    const [rusher, builder] = [totals.rival2, totals.rival4];
    expect(rusher.attacks / rusher.matches).toBeGreaterThan(builder.attacks / builder.matches);
    expect(rusher.gunk / rusher.attacks).toBeLessThan(builder.gunk / builder.attacks);
  });

  it("the Builder's average longest chain beats the Rusher's", () => {
    expect(totals.rival4.chains / 20).toBeGreaterThan(totals.rival2.chains / 20);
  });

  it("the Painter's stain matches per splat beat the Rookie's", () => {
    const [painter, rookie] = [totals.rival3, totals.rival1];
    expect(painter.stains / painter.splats).toBeGreaterThan(rookie.stains / rookie.splats);
  });
});
