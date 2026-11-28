import { describe, expect, it } from 'vitest';
import { createRival, rivalInput } from '../../src/ai/rival.js';
import { createSparring, sparringInput } from '../../src/ai/sparring.js';
import { RIVALS } from '../../src/config/rivals.js';
import { RULES } from '../../src/config/rules.js';
import { INPUT, step } from '../../src/core/engine.js';
import { createVersus, stepVersus } from '../../src/core/versus.js';
import { stateWith } from '../core/fixtures.js';

const ACTIONS = INPUT.LEFT | INPUT.RIGHT | INPUT.ROTATE_CW | INPUT.ROTATE_CCW | INPUT.RINSE | INPUT.BOMB;
const TICKS = 4000;

/**
 * Plays a rival against the sparring rival for some ticks, calling `check` before each step.
 * @returns {number[]} the rival's inputs
 */
function play(id, seed, ticks = TICKS, check = (_bot, _match, _input) => {}) {
  const match = createVersus(seed);
  const bot = createRival(id, seed);
  const sparring = createSparring();
  const inputs = [];
  while (match.outcome === null && match.tick < ticks) {
    const input = rivalInput(bot, match.boards[1], match.boards[0]);
    check(bot, match, input);
    inputs.push(input);
    stepVersus(match, sparringInput(sparring, match.boards[0]), input);
  }
  return inputs;
}

describe('CPU rivals', () => {
  it.each(RIVALS.map((r) => r.id))('%s keeps to its work budget and its pace', { timeout: 60000 }, (id) => {
    const { budget, pace } = RIVALS.find((r) => r.id === id);
    let lastAction = -Infinity;
    let drops = 0;
    play(id, 3, TICKS, (bot, match, input) => {
      expect(bot.units).toBeLessThanOrEqual(budget);
      if (input & ACTIONS) {
        expect(match.tick - lastAction).toBeGreaterThanOrEqual(pace.actEvery);
        lastAction = match.tick;
      }
      if (input & INPUT.SOFT_DROP) {
        // The persona's patience shifts the profile's drop delay.
        expect(bot.waited).toBeGreaterThanOrEqual(bot.dropDelay);
        expect(Math.abs(bot.dropDelay - pace.dropDelay)).toBeLessThanOrEqual(10);
        drops++;
      }
    });
    expect(drops).toBeGreaterThan(0);
  });

  it('gives the same inputs for the same match twice', { timeout: 60000 }, () => {
    expect(play('rival5', 11, 2500)).toEqual(play('rival5', 11, 2500));
  });

  it('two rivals on the same seed play differently', { timeout: 60000 }, () => {
    expect(play('rival2', 11, 1500)).not.toEqual(play('rival3', 11, 1500));
  });

  it('never changes the boards when choosing an input', { timeout: 60000 }, () => {
    const match = createVersus(9);
    const bot = createRival('rival4', 9);
    const sparring = createSparring();
    while (match.outcome === null && match.tick < 2000) {
      const before = structuredClone(match);
      const input = rivalInput(bot, match.boards[1], match.boards[0]);
      expect(match).toEqual(before);
      stepVersus(match, sparringInput(sparring, match.boards[0]), input);
    }
  });

  it("can't see the piece stream, the gunk stream or pairs past the preview", { timeout: 60000 }, () => {
    // Two boards that look the same but will draw different pairs and drop gunk elsewhere.
    const a = createVersus(21).boards[1];
    const b = { ...structuredClone(a), rng: (a.rng ^ 0x5bd1e995) >>> 0, gunkRng: (a.gunkRng ^ 0x1b873593) >>> 0 };
    const bots = [createRival('rival5', 21), createRival('rival5', 21)];
    let compared = 0;
    while (JSON.stringify(a.queue) === JSON.stringify(b.queue) && a.phase !== 'over') {
      const inputs = [rivalInput(bots[0], a), rivalInput(bots[1], b)];
      expect(inputs[0]).toBe(inputs[1]);
      step(a, inputs[0]);
      step(b, inputs[1]);
      compared++;
    }
    expect(compared).toBeGreaterThan(30);
  });

  it('Rinses when its pending gunk would reach the spawn row', () => {
    const state = stateWith('...g...\n...y...\n...g...\n...y...\n...g...\n...y...\n...g...');
    Object.assign(state, { meter: RULES.meter.max, pending: 35 });
    const bot = createRival('rival4', 1);
    const inputs = [];
    for (let i = 0; i < RIVALS[3].pace.actEvery + 1; i++) inputs.push(rivalInput(bot, state));
    expect(inputs).toContain(INPUT.RINSE);
  });

  it('moves the pair to its Bomb column before firing, so the Bomb lands where it planned', () => {
    const state = stateWith('ygbrpyg\nbrpygbr');
    state.meter = RULES.meter.max;
    const bot = createRival('rival2', 1);
    rivalInput(bot, state);
    bot.job.done = true;
    bot.target = { col: 5, orientation: 0, meter: INPUT.BOMB, bombCol: 5 };
    let bomb = null;
    for (let i = 0; i < 200 && !bomb; i++) {
      const input = rivalInput(bot, state);
      if (input & INPUT.BOMB) expect(state.pair.col).toBe(5);
      bomb = step(state, input).find((e) => e.type === 'bomb') ?? null;
    }
    expect(bomb?.target.col).toBe(5);
  });
});
