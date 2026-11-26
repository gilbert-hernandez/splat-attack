import { describe, expect, it } from 'vitest';
import { createSparring, greedyInput, meterInput, planPair, sparringInput } from '../../src/ai/sparring.js';
import { RULES } from '../../src/config/rules.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { createVersus, stepVersus } from '../../src/core/versus.js';
import { stateWith } from '../core/fixtures.js';

const MOVES = INPUT.LEFT | INPUT.RIGHT | INPUT.ROTATE_CW | INPUT.ROTATE_CCW | INPUT.RINSE | INPUT.BOMB;
const MAX = RULES.meter.max;
const PACE = createSparring().pace;

describe('sparring rival', () => {
  it('gives the same inputs for the same state', () => {
    const play = () => {
      const state = createState(21);
      const bot = createSparring();
      const inputs = [];
      for (let i = 0; i < 3000 && state.phase !== 'over'; i++) {
        const input = sparringInput(bot, state);
        inputs.push(input);
        step(state, input);
      }
      return inputs;
    };
    expect(play()).toEqual(play());
  });

  it('moves at most once per actEvery ticks and drops only after dropDelay in place', () => {
    const { actEvery, dropDelay } = RULES.sparring;
    const state = createState(4);
    const bot = createSparring();
    let lastMove = -Infinity;
    let pairs = state.pairs;
    let inPlaceSince = null;
    for (let tick = 0; tick < 5000 && state.phase !== 'over'; tick++) {
      if (state.pairs !== pairs) {
        pairs = state.pairs;
        inPlaceSince = null;
      }
      const input = sparringInput(bot, state);
      if (input & MOVES) {
        expect(tick - lastMove).toBeGreaterThanOrEqual(actEvery);
        lastMove = tick;
      }
      if (state.phase === 'falling' && greedyInput(state, bot.plan) === INPUT.SOFT_DROP && inPlaceSince === null) {
        inPlaceSince = tick;
      }
      if (input & INPUT.SOFT_DROP) expect(tick - inPlaceSince).toBeGreaterThanOrEqual(dropDelay);
      step(state, input);
    }
    expect(state.pairs).toBeGreaterThan(10);
  });

  it('plans around gunk without treating it as a color', () => {
    // Gunk next to the reds mustn't count as a red neighbor; the plan goes where the reds connect.
    const state = stateWith('##.....\n##rrr..', { pivot: 1, other: 1 });
    const plan = planPair(state);
    expect(plan).not.toBeNull();
    expect([2, 3, 4, 5]).toContain(plan.col);
  });

  it('plays a whole match against a slower copy of itself, splatting and sending gunk', () => {
    const match = createVersus(13);
    const bot = createSparring();
    const slow = createSparring({ actEvery: RULES.sparring.actEvery * 3, dropDelay: RULES.sparring.dropDelay * 3 });
    let splats = 0;
    let sent = 0;
    let fired = 0;
    while (match.outcome === null && match.tick < 100000) {
      const player = sparringInput(slow, match.boards[0]);
      const [events, rivalEvents] = stepVersus(match, player, sparringInput(bot, match.boards[1]));
      for (const event of rivalEvents) {
        if (event.type === 'splat') splats++;
        if (event.type === 'attack') sent += event.sent;
      }
      for (const event of [...events, ...rivalEvents]) if (event.type === 'rinse' || event.type === 'bomb') fired++;
    }
    expect(match.outcome).not.toBeNull();
    expect(splats).toBeGreaterThan(0);
    expect(sent).toBeGreaterThan(0);
    expect(fired).toBeGreaterThan(0);
  });

  describe('meter', () => {
    const TALL = new Array(RULES.visibleRows - PACE.bombRows + 1).fill('g......').join('\n');

    it('Rinses once enough gunk is pending', () => {
      const state = stateWith(TALL);
      Object.assign(state, { meter: MAX, pending: PACE.rinseAt });
      expect(meterInput(state, PACE)).toBe(INPUT.RINSE);
      expect(sparringInput(createSparring(), state)).toBe(INPUT.RINSE);
    });

    it('Bombs a stack near the top when little gunk is pending', () => {
      const state = stateWith(TALL);
      Object.assign(state, { meter: MAX, pending: PACE.rinseAt - 1 });
      expect(meterInput(state, PACE)).toBe(INPUT.BOMB);
      const low = stateWith(TALL.split('\n').slice(1).join('\n'));
      low.meter = MAX;
      expect(meterInput(low, PACE)).toBe(0);
    });

    it('does nothing until the meter is full', () => {
      const state = stateWith(TALL);
      Object.assign(state, { meter: MAX - 1, pending: 20 });
      expect(meterInput(state, PACE)).toBe(0);
    });

    it('waits out its act cooldown before firing', () => {
      const state = stateWith('.......');
      const bot = createSparring();
      sparringInput(bot, state);
      Object.assign(state, { meter: MAX, pending: PACE.rinseAt });
      bot.cooldown = 2;
      expect([sparringInput(bot, state), sparringInput(bot, state), sparringInput(bot, state)]).toEqual([
        0,
        0,
        INPUT.RINSE,
      ]);
    });
  });
});
