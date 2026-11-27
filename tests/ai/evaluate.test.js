import { describe, expect, it } from 'vitest';
import {
  FATAL,
  bombed,
  heightOf,
  placements,
  probeChain,
  probes,
  rateShape,
  simulate,
  steer,
} from '../../src/ai/evaluate.js';
import { RULES } from '../../src/config/rules.js';
import { createSparring, sparringInput } from '../../src/ai/sparring.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { RIGHT, UP } from '../../src/core/pair.js';
import { board, renderBoard, renderStains, stateWith } from '../core/fixtures.js';

const WEIGHTS = { links: 0, height: 0, spawnColumn: 0, gunk: 0, stainSetup: 0 };

/** Locks the state's grounded pair through the engine and runs out the chain (no gunk pending). */
function engineDrop(state) {
  step(state, INPUT.SOFT_DROP);
  for (let i = 0; i < 1000 && state.phase !== 'falling' && state.phase !== 'over'; i++) step(state);
}

describe('rival evaluation', () => {
  it('locks and chains exactly like the engine, over real boards', () => {
    // Boards from a sparring match; every placement of each board's pair, locked by the engine too.
    const match = createState(5);
    const bot = createSparring({ actEvery: 1, dropDelay: 0 });
    let compared = 0;
    let longest = 0;
    while (match.phase !== 'over' && match.tick < 20000) {
      if (match.phase === 'falling' && match.tick % 37 === 0) {
        for (const { pair } of placements(match.grid, match.pair)) {
          const outcome = simulate(match, pair);
          const engine = structuredClone(match);
          engine.pair = { ...pair };
          const before = engine.score;
          engineDrop(engine);
          expect(outcome.points).toBe(engine.score - before);
          expect(renderBoard(outcome.grid)).toBe(renderBoard(engine.grid));
          expect(renderStains(outcome.stains)).toBe(renderStains(engine.stains));
          compared++;
          longest = Math.max(longest, outcome.chain);
        }
      }
      step(match, sparringInput(bot, match));
    }
    expect(compared).toBeGreaterThan(500);
    expect(longest).toBeGreaterThanOrEqual(2);
  });

  it('counts stain matches and adds their points and power', () => {
    const text = 'rrr....';
    const pair = { col: 3, row: RULES.hiddenRows + RULES.visibleRows - 1, pivot: 1, other: 4, orientation: UP };
    const plain = simulate(stateWith(text, pair), { ...stateWith(text, pair).pair });
    const stained = stateWith(text, pair, 'rrrr...');
    const outcome = simulate(stained, { ...stained.pair });
    expect(plain.stainMatches).toBe(0);
    expect(outcome.stainMatches).toBe(4);
    expect(outcome.points).toBeGreaterThan(plain.points);
    expect(outcome.power).toBeGreaterThan(plain.power);
  });

  it('cracks and clears gunk next to a splat', () => {
    const state = stateWith('#+.....\nrrr....', { col: 3, row: 13, pivot: 1, other: 4, orientation: UP });
    const outcome = simulate(state, { ...state.pair });
    expect(renderBoard(outcome.grid)).toBe(board('.......\n+..b...'));
  });

  it("rejects places the pair can't reach and never leaves the board", () => {
    // A wall at column 2 as high as the spawn row: the pair can't pass it.
    const wall = new Array(RULES.visibleRows).fill('..g....').join('\n');
    const state = stateWith(wall);
    expect(steer(state.grid, state.pair, 0, UP)).toBeNull();
    expect(steer(state.grid, state.pair, 5, RIGHT)).not.toBeNull();
    const cols = placements(state.grid, state.pair).map((p) => p.pair.col);
    expect(Math.min(...cols)).toBeGreaterThanOrEqual(3);
    for (const { pair } of placements(stateWith('.......').grid, state.pair)) {
      expect(pair.col).toBeGreaterThanOrEqual(0);
      expect(pair.col).toBeLessThan(7);
    }
  });

  it('counts a same-colored pair once per distinct landing', () => {
    const state = stateWith('.......', { pivot: 2, other: 2 });
    // 7 upright columns + 6 flat pairs of columns.
    expect(placements(state.grid, state.pair)).toHaveLength(13);
    expect(placements(state.grid, { ...state.pair, other: 3 })).toHaveLength(26);
  });

  it('Bombs like the engine', () => {
    const state = stateWith('#.yb...\nrgpy...\nyrbgp..', { col: 2 }, 'ppppppp');
    const after = bombed(state, state.pair);
    state.meter = RULES.meter.max;
    step(state, INPUT.BOMB);
    expect(renderBoard(after.grid)).toBe(renderBoard(state.grid));
    expect(renderStains(after.stains)).toBe(renderStains(state.stains));
  });

  it('rates a topped-out board worst, and a tall spawn column lower', () => {
    const spawnWeights = { ...WEIGHTS, spawnColumn: -1 };
    const full = stateWith(new Array(RULES.visibleRows).fill('...g...').join('\n'));
    expect(rateShape(full, 0, spawnWeights)).toBe(FATAL);
    const tall = stateWith('...r...\n...g...\n...y...');
    const flat = stateWith('rgy....');
    expect(heightOf(tall.grid, 3)).toBe(3);
    expect(rateShape(tall, 0, spawnWeights)).toBeLessThan(rateShape(flat, 0, spawnWeights));
    expect(rateShape(flat, 4, { ...WEIGHTS, height: -1 })).toBe(-7);
  });

  it('finds a longer chain setup on a board one blob from a three-step chain', () => {
    // A yellow on column 2 splats the yellows, then the reds, then the greens.
    const ready = stateWith('...g...\n...b...\n...rg..\n...rg..\n...rg..\nyy.yr..');
    const flat = stateWith('rygbp..');
    const longest = (grid) => Math.max(0, ...probes(grid).map((p) => probeChain(grid, p)));
    expect(longest(ready.grid)).toBe(3);
    expect(longest(flat.grid)).toBe(0);
    expect(probes(flat.grid)).toEqual([]);
  });
});
