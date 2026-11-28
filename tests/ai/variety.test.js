import { describe, expect, it } from 'vitest';
import { checkPlan, createRival, rivalInput } from '../../src/ai/rival.js';
import { createSparring, sparringInput } from '../../src/ai/sparring.js';
import { seen } from '../../src/ai/view.js';
import { createVersus, stepVersus } from '../../src/core/versus.js';
import { stateWith } from '../core/fixtures.js';

/** A rival's inputs and its locked cells over a match against the sparring rival. */
function play(id, matchSeed, botSeed, ticks, setup = (_bot) => {}) {
  const match = createVersus(matchSeed);
  const bot = createRival(id, botSeed);
  setup(bot);
  const sparring = createSparring();
  const inputs = [];
  const locks = [];
  while (match.outcome === null && match.tick < ticks) {
    const input = rivalInput(bot, match.boards[1], match.boards[0]);
    inputs.push(input);
    const [, events] = stepVersus(match, sparringInput(sparring, match.boards[0]), input);
    for (const event of events) if (event.type === 'lock') locks.push(event.cells);
  }
  return { inputs, locks };
}

describe('the bot seed', () => {
  it('changes the rival but not the pieces', { timeout: 60000 }, () => {
    const a = play('rival4', 5, 100, 1500);
    const b = play('rival4', 5, 200, 1500);
    expect(a.inputs).not.toEqual(b.inputs);
    const colors = (locks) => locks.map((cells) => cells.map((c) => c.color).sort());
    const n = Math.min(a.locks.length, b.locks.length, 8);
    expect(colors(a.locks).slice(0, n)).toEqual(colors(b.locks).slice(0, n));
  });
});

describe('the persona shows in play', () => {
  it('a rival preferring the left builds more on the left than one preferring the right', { timeout: 60000 }, () => {
    const leftHalf = (locks) =>
      locks
        .slice(0, 8)
        .flat()
        .filter((c) => c.col < 3).length;
    const lean = (area) => (bot) => {
      bot.persona = { ...bot.persona, area, areaBonus: bot.profile.vary.areaBonus[1] };
    };
    const left = play('rival4', 8, 8, 6000, lean(0));
    const right = play('rival4', 8, 8, 6000, lean(6));
    expect(leftHalf(left.locks)).toBeGreaterThan(leftHalf(right.locks));
  });
});

describe('dropping failed plans', () => {
  const flat = () => seen(stateWith('r......'));
  const reading = (setup, fired = 0) => ({
    setup,
    fired,
    threat: 0,
    playerStains: 0,
    playerTallest: 0,
    playerMeterFull: false,
    playerPending: 0,
    gap: 0,
    pending: 0,
  });
  const builder = (changes = {}) => Object.assign(createRival('rival4', 1), { plan: 'build', hold: 0 }, changes);

  it('drops a build plan whose chain of 4 was buried to 2', () => {
    const bot = builder({ setup: 4 });
    checkPlan(bot, flat(), reading(2));
    expect(bot.plan).not.toBe('build');
    expect(bot.switches).toBe(1);
    expect(bot.hold).toBe(bot.profile.vary.hold);
  });

  it('keeps a build plan whose chain is intact, or was fired', () => {
    const intact = builder({ setup: 4 });
    checkPlan(intact, flat(), reading(4));
    const fired = builder({ setup: 4 });
    checkPlan(fired, flat(), reading(0, 4));
    expect([intact.plan, fired.plan]).toEqual(['build', 'build']);
    expect(intact.switches + fired.switches).toBe(0);
  });

  it('drops a build plan once the stack is too high', () => {
    const bot = builder();
    const column = Array.from({ length: bot.profile.vary.highStack }, (_, i) => 'rgby'[i % 4] + '......');
    const tall = seen(stateWith(column.join('\n')));
    checkPlan(bot, tall, reading(0));
    expect(bot.plan).not.toBe('build');
  });

  it('drops a paint plan after its dry pairs with nothing on a matching stain', () => {
    const bot = builder({ plan: 'paint' });
    const { dryPairs } = bot.profile.vary;
    const stainedElsewhere = () => seen(stateWith('r......', {}, '......b'));
    for (let i = 1; i < dryPairs; i++) {
      checkPlan(bot, stainedElsewhere(), reading(0));
      expect(bot.plan).toBe('paint');
    }
    checkPlan(bot, stainedElsewhere(), reading(0));
    expect(bot.plan).not.toBe('paint');
  });

  it("doesn't count dry pairs before the board has any stain", () => {
    const bot = builder({ plan: 'paint' });
    for (let i = 0; i < bot.profile.vary.dryPairs * 2; i++) checkPlan(bot, flat(), reading(0));
    expect(bot.plan).toBe('paint');
    expect(bot.dry).toBe(0);
  });

  it('a blob on a matching stain keeps a paint plan going', () => {
    const bot = builder({ plan: 'paint', dry: 50 });
    checkPlan(bot, seen(stateWith('r......', {}, 'r......')), reading(0));
    expect(bot.plan).toBe('paint');
    expect(bot.dry).toBe(0);
  });

  it('checks no failure while holding a new plan', () => {
    const bot = builder({ setup: 4, hold: 3 });
    checkPlan(bot, flat(), reading(0));
    expect(bot.plan).toBe('build');
    expect(bot.hold).toBe(2);
  });

  it('switches plans during real matches, and the same way twice', { timeout: 120000 }, () => {
    let switches = 0;
    const runs = [0, 1].map(() => {
      const bots = [];
      for (let seed = 1; seed <= 6; seed++) {
        let bot = null;
        play('rival3', seed, seed, 8000, (b) => (bot = b));
        bots.push([bot.plan, bot.switches]);
        switches += bot.switches;
      }
      return bots;
    });
    expect(runs[0]).toEqual(runs[1]);
    expect(switches).toBeGreaterThan(0);
  });
});
