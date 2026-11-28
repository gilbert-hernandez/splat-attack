import { describe, expect, it } from 'vitest';
import { rateArea, rateMove, rateShape } from '../../src/ai/evaluate.js';
import { AREAS, drawPersona, pairProfile, pressureOf, signatureOf } from '../../src/ai/persona.js';
import { pick, ranked, startPlan, stepPlan } from '../../src/ai/planner.js';
import { createRival, rivalInput, validateRivals } from '../../src/ai/rival.js';
import { seen } from '../../src/ai/view.js';
import { PLANS, RIVALS } from '../../src/config/rivals.js';
import { RULES } from '../../src/config/rules.js';
import { ROWS } from '../../src/core/grid.js';
import { parseBoard, stateWith } from '../core/fixtures.js';

const SEEDS = Array.from({ length: 200 }, (_, i) => 1000 + i);
const copy = (changes) => [{ ...structuredClone(RIVALS[2]), ...changes }];
const varyWith = (changes) => copy({ vary: { ...structuredClone(RIVALS[2].vary), ...changes } });

/** A persona that changes nothing but the plan: no risk, no patience, no preferences. */
/** @type {import('../../src/ai/persona.js').Persona} */
const NEUTRAL = { plan: 'build', risk: 0, patience: 0, colors: [1], colorBonus: 0, area: 3, areaBonus: 0 };

/** Extra job work after the search: five units. */
function* fiveUnits() {
  for (let i = 0; i < 5; i++) yield;
}

/** A reading of two quiet boards. */
const QUIET = {
  setup: 0,
  fired: 0,
  threat: 0,
  playerStains: 0,
  playerTallest: 0,
  playerMeterFull: false,
  playerPending: 0,
  gap: 0,
  pending: 0,
};

describe('variety settings in the profiles', () => {
  it('rejects plan weights that do not add up to 100, naming the rival', () => {
    expect(() => validateRivals(varyWith({ plans: { build: 50, rush: 20, paint: 20 } }))).toThrow(
      /Rival rival3: vary.plans/,
    );
    expect(() => validateRivals(varyWith({ plans: { build: 50, sulk: 50 } }))).toThrow(/rival3: vary.plans/);
  });

  it('rejects an empty or non-integer range', () => {
    expect(() => validateRivals(varyWith({ risk: [1, -1] }))).toThrow(/rival3: vary.risk/);
    expect(() => validateRivals(varyWith({ patience: [0, 1.5] }))).toThrow(/rival3: vary.patience/);
    expect(() => validateRivals(varyWith({ colors: [1, 3] }))).toThrow(/rival3: vary.colors/);
  });

  it('rejects a negative margin or adaptation strength', () => {
    expect(() => validateRivals(copy({ margin: -1 }))).toThrow(/rival3: margin/);
    expect(() => validateRivals(copy({ adapt: { ...RIVALS[2].adapt, threat: -5 } }))).toThrow(/rival3: adapt.threat/);
  });
});

describe('persona', () => {
  it('comes from the bot seed', () => {
    expect(createRival('rival4', 77).persona).toEqual(createRival('rival4', 77).persona);
    expect(drawPersona(RIVALS[0], 5)).toEqual(drawPersona(RIVALS[0], 5));
  });

  it.each(RIVALS.map((r) => r.id))('%s draws personas inside its ranges, with every plan it allows', (id) => {
    const profile = RIVALS.find((r) => r.id === id);
    const { vary } = profile;
    const personas = SEEDS.map((seed) => createRival(id, seed).persona);
    /** @param {number} value @param {number[]} range */
    const inRange = (value, range) => value >= range[0] && value <= range[1];
    for (const p of personas) {
      expect(inRange(p.risk, vary.risk)).toBe(true);
      expect(inRange(p.patience, vary.patience)).toBe(true);
      expect(inRange(p.colors.length, vary.colors)).toBe(true);
      expect(new Set(p.colors).size).toBe(p.colors.length);
      for (const color of p.colors) expect(inRange(color, [1, RULES.colors])).toBe(true);
      expect(inRange(p.colorBonus, vary.colorBonus)).toBe(true);
      expect(inRange(p.areaBonus, vary.areaBonus)).toBe(true);
      expect(AREAS).toContain(p.area);
    }
    const plans = new Set(personas.map((p) => p.plan));
    for (const [plan, weight] of Object.entries(vary.plans))
      expect(plans.has(/** @type {any} */ (plan))).toBe(weight > 0);
    expect(new Set(personas.map((p) => p.area)).size).toBeGreaterThan(1);
    expect(new Set(personas.map((p) => p.colors[0])).size).toBeGreaterThan(1);
  });

  it.each([
    ['rival2', 'rush'],
    ['rival3', 'paint'],
    ['rival4', 'build'],
  ])("%s's most common starting plan is its signature %s", (id, signature) => {
    const counts = {};
    for (const seed of SEEDS) {
      const { plan } = createRival(id, seed).persona;
      counts[plan] = (counts[plan] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toBe(signature);
  });

  it('a plain rival draws no persona', () => {
    const bot = createRival('rival5', 3, { plain: true });
    expect(bot.persona).toBeNull();
    expect(bot.plan).toBeNull();
    expect(bot.dropDelay).toBe(RIVALS[4].pace.dropDelay);
  });
});

describe('persona preferences in the rating', () => {
  const ZERO = Object.fromEntries(Object.keys(RIVALS[0].weights).map((k) => [k, 0]));

  it('nudges a first move toward the preferred side, only in the lower half', () => {
    const prefs = { areaCol: 0, colorMask: 0 };
    const pair = (col, row) => ({ pivot: 1, other: 2, col, row, orientation: 0, progress: 0, budget: 0 });
    // A vertical pair at the bottom: both cells count, 3 each at the preferred column.
    expect(rateArea(pair(0, ROWS - 1), prefs, 2)).toBe(12);
    expect(rateArea(pair(1, ROWS - 1), prefs, 2)).toBe(8);
    expect(rateArea(pair(6, ROWS - 1), prefs, 2)).toBe(0);
    // High up the board it doesn't count, so it never rewards a tall stack.
    expect(rateArea(pair(0, RULES.hiddenRows + 1), prefs, 2)).toBe(0);
    // The board's rating doesn't depend on the side.
    const weights = { ...ZERO, colorLinks: 0 };
    const left = { grid: parseBoard('r......'), stains: parseBoard('') };
    const right = { grid: parseBoard('......r'), stains: parseBoard('') };
    expect(rateShape(left, 0, weights, prefs)).toBe(rateShape(right, 0, weights, prefs));
  });

  it('rates a link of a preferred color higher than another color', () => {
    const weights = { ...ZERO, links: 10, area: 0, colorLinks: 5 };
    const red = { grid: parseBoard('rr.....'), stains: parseBoard('') };
    const blue = { grid: parseBoard('bb.....'), stains: parseBoard('') };
    const prefs = { areaCol: 3, colorMask: 1 << 1 };
    expect(rateShape(red, 0, weights, prefs)).toBe(15);
    expect(rateShape(blue, 0, weights, prefs)).toBe(10);
  });

  it.each(/** @type {(keyof typeof PLANS)[]} */ (['rush', 'paint']))(
    'the %s plan applies its overlay to the Builder',
    (plan) => {
      const profile = RIVALS[3];
      const { weights, fire } = pairProfile(profile, { ...NEUTRAL, plan }, plan, null);
      const overlay = PLANS[plan];
      for (const [key, percent] of Object.entries(overlay.weights)) {
        expect(weights[key]).toBe(Math.floor((profile.weights[key] * percent + 50) / 100));
      }
      expect(fire.at).toBe(overlay.fireSet > 0 ? overlay.fireSet : profile.fire.at + overlay.fireShift);
    },
  );

  it('a signature plan leaves the profile as tuned', () => {
    expect(RIVALS.map((r) => signatureOf(r))).toEqual(['rush', 'rush', 'paint', 'build', 'build']);
    const profile = RIVALS[3];
    const { weights, fire } = pairProfile(profile, NEUTRAL, 'build', null);
    expect(fire.at).toBe(profile.fire.at);
    expect(weights.chainSetup).toBe(profile.weights.chainSetup);
    expect(weights.attack).toBe(profile.weights.attack);
  });

  it('risk shifts fire.at and eases the stack penalties', () => {
    const profile = RIVALS[3];
    const bold = pairProfile(profile, { ...NEUTRAL, risk: 1 }, 'paint', null);
    const careful = pairProfile(profile, { ...NEUTRAL, risk: -1 }, 'paint', null);
    expect(bold.fire.at).toBe(careful.fire.at + 2);
    expect(bold.weights.spawnColumn).toBeGreaterThan(careful.weights.spawnColumn);
    expect(bold.weights.height).toBeGreaterThanOrEqual(careful.weights.height);
  });
});

describe('near-tie pick', () => {
  const root = (score, index, depth = 2) => ({ move: { col: index }, index, depth, score });
  const job = /** @type {any} */ ({ roots: [root(100, 0), root(95, 1), root(50, 2), root(40, 3)] });

  it('treats moves within the margin as rank 0 and counts lower ranks after them', () => {
    expect(pick(job, 0, 10, 0).col).toBe(0);
    expect(pick(job, 0, 10, 1).col).toBe(1);
    expect(pick(job, 0, 10, 2).col).toBe(0);
    expect(pick(job, 1, 10, 0).col).toBe(2);
    expect(pick(job, 2, 10, 0).col).toBe(3);
  });

  it('with margin 0 picks exactly by rank', () => {
    expect([0, 1, 2, 3].map((rank) => pick(job, rank, 0, 1).col)).toEqual([0, 1, 2, 3]);
  });

  it('plays more than one near-equal opening across seeds', { timeout: 60000 }, () => {
    const firsts = new Set();
    for (const seed of SEEDS) {
      const bot = createRival('rival5', seed);
      const state = stateWith('');
      for (let i = 0; i < 200 && bot.target === null; i++) rivalInput(bot, state);
      firsts.add(JSON.stringify(bot.target));
    }
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('picks a move outside the margin no more often than its rank weights allow', { timeout: 120000 }, () => {
    let outside = 0;
    const bots = 1000;
    for (let seed = 0; seed < bots; seed++) {
      const bot = createRival('rival3', seed);
      const state = stateWith('rgbypr.\ngbyprg.', { pivot: 3, other: 4 });
      for (let i = 0; i < 400 && bot.target === null; i++) rivalInput(bot, state);
      const order = ranked(bot.job);
      const top = order[0];
      const tied = order.filter((r) => r.depth === top.depth && r.score >= top.score - bot.profile.margin);
      if (!tied.some((r) => JSON.stringify(r.move) === JSON.stringify(bot.target))) outside++;
    }
    const allowed = 100 - RIVALS[2].pickWeights[0];
    expect((100 * outside) / bots).toBeLessThanOrEqual(allowed + 5);
  });
});

describe('adaptation', () => {
  const builder = RIVALS[3];
  /** @param {object} reading @param {keyof typeof PLANS} [plan] */
  const adapted = (reading, plan = 'build') => pairProfile(builder, NEUTRAL, plan, { ...QUIET, ...reading });

  it('under threat it values firing a smaller chain more', () => {
    // The Ace reacts to threats; the Builder and the Painter keep to their plans (adapt.threat 0).
    const ace = (reading) => pairProfile(RIVALS[4], NEUTRAL, 'build', { ...QUIET, ...reading });
    const calm = ace({});
    const threatened = ace({ threat: 4 });
    expect(adapted({ threat: 4 }).fire).toEqual(adapted({}).fire);
    expect(pressureOf({ ...QUIET, threat: 4 })).toBe(100);
    expect(threatened.fire.at).toBeLessThan(calm.fire.at);
    const twoChain = {
      grid: [],
      stains: [],
      toppedOut: false,
      chain: 2,
      points: 400,
      power: 4 * RULES.attack.powerPerGunk,
      stainMatches: 0,
    };
    const value = (p) => rateMove(twoChain, 0, p.weights, p.fire).value;
    expect(value(threatened)).toBeGreaterThan(value(calm));
  });

  it("values attack less and building more while the player's meter is full", () => {
    const calm = adapted({});
    const wary = adapted({ playerMeterFull: true });
    expect(wary.weights.attack).toBeLessThan(calm.weights.attack);
    expect(wary.weights.chainSetup).toBeGreaterThan(calm.weights.chainSetup);
    // A player with gunk of their own would Rinse that, not the attack.
    expect(adapted({ playerMeterFull: true, playerPending: 5 }).weights.attack).toBe(calm.weights.attack);
  });

  it('holds out for a longer chain when far behind, and plays safer when well ahead', () => {
    const acePlan = (reading) => pairProfile(RIVALS[4], NEUTRAL, 'build', { ...QUIET, ...reading });
    const { gapPoints } = RIVALS[4].adapt;
    const level = acePlan({});
    expect(acePlan({ gap: gapPoints + 1 }).fire.at).toBe(level.fire.at + 1);
    const ahead = acePlan({ gap: -gapPoints - 1 });
    expect(ahead.fire.at).toBe(level.fire.at - 1);
    expect(ahead.weights.height).toBeLessThan(level.weights.height);
  });

  it('values cancelling more and fires sooner with gunk pending', () => {
    const calm = adapted({});
    const buried = adapted({ pending: 14 });
    expect(buried.weights.cancel).toBeGreaterThan(calm.weights.cancel);
    expect(buried.fire.at).toBe(calm.fire.at - 1);
  });

  it('never fires below a chain of 1', () => {
    // The Rusher fires any chain already (fire.at 1); every signal pushes it lower still.
    const rusher = pairProfile(RIVALS[1], { ...NEUTRAL, plan: 'rush', risk: -1 }, 'rush', {
      ...QUIET,
      threat: 4,
      gap: -99999,
      pending: 30,
    });
    expect(rusher.fire.at).toBe(1);
  });

  it('reads the boards with the units left after the search, the same however they are split', () => {
    const state = stateWith('rrbbgg.\nggrrbb.\nbbggrr.', { pivot: 1, other: 2 });
    const player = stateWith('rr.....\nrgg....\nbbg....');
    const run = (units) => {
      const bot = createRival('rival5', 9);
      const job = startPlan(seen(state, player), bot.profile, fiveUnits);
      let searchedAt = -1;
      while (!job.done) {
        expect(stepPlan(job, units)).toBeLessThanOrEqual(units);
        if (job.searched && searchedAt < 0) searchedAt = job.units;
      }
      return { roots: ranked(job).map((r) => [r.move, r.score]), searchedAt, units: job.units };
    };
    const one = run(1);
    expect(one.units).toBeGreaterThan(one.searchedAt);
    expect(run(1000000).roots).toEqual(one.roots);
  });

  it('spends its first unit of every pair on the search, never on reading', () => {
    const state = stateWith('rrbbgg.\nggrrbb.\nbbggrr.', { pivot: 1, other: 2 });
    const player = stateWith('rr.....\nrgg....\nbbg....');
    for (const id of RIVALS.map((r) => r.id)) {
      const bot = createRival(id, 4);
      rivalInput(bot, state, player);
      expect(bot.job.best).not.toBeNull();
    }
  });

  it('a rival plans its next pair with what it read during this one', { timeout: 60000 }, () => {
    const state = stateWith('rrbbgg.\nggrrbb.\nbbggrr.', { pivot: 1, other: 2 });
    const player = stateWith('rr.....\nrgg....\nbbg....');
    const bot = createRival('rival5', 9);
    for (let i = 0; i < 300 && !bot.job?.done; i++) rivalInput(bot, state, player);
    expect(bot.job.searched).toBe(true);
    expect(bot.reading).toMatchObject({ threat: expect.any(Number), playerTallest: 3, setup: expect.any(Number) });
  });
});
