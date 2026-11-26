import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import { COLUMNS, EMPTY, ROWS } from '../../src/core/grid.js';
import { splatPoints } from '../../src/core/splat.js';
import { applyStains, createStains } from '../../src/core/stain.js';
import { board, parseStains, renderStains, stateWith } from './fixtures.js';

const SOFT = INPUT.SOFT_DROP;
const [RED, BLUE] = [1, 4];
const BOTTOM = ROWS - 1;
const row = (cols, r = BOTTOM) => cols.map((col) => ({ col, row: r }));

// A red at the bottom left starts a 6-step chain (as in splat.test.js).
const STAIRS = `
  .ygbpr.
  .rygbpr
  .rygbpr
  .rygbpr`;
// Each step stains its cells; the next step's color paints over the cells it shares.
const STAIRS_STAINS = board(`
  .rygbpr
  .rygbpr
  rygbprr`);

/** Locks the pair at once in column 0, red below blue, then steps to the next pair. */
function dropLeft(text, stains) {
  const state = stateWith(text, { col: 0, row: BOTTOM }, stains);
  const events = step(state, SOFT);
  for (let ticks = 0; state.phase !== 'falling' && state.phase !== 'over'; ticks++) {
    if (ticks > 10000) throw new Error('never settled');
    events.push(...step(state));
  }
  return { state, splats: events.filter((e) => e.type === 'splat') };
}

describe('applyStains', () => {
  it('stains clean cells with the group color', () => {
    const stains = createStains();
    expect(applyStains(stains, [{ color: RED, cells: row([0, 1, 2, 3]) }])).toEqual([[]]);
    expect(renderStains(stains)).toBe(board('rrrr...'));
  });

  it('paints over other colors and keeps matching stains', () => {
    const stains = parseStains('rbb....');
    const matched = applyStains(stains, [{ color: RED, cells: row([0, 1, 2, 3]) }]);
    expect(matched).toEqual([row([0])]);
    expect(renderStains(stains)).toBe(board('rrrr...'));
  });

  it('handles several groups in one step, in group order', () => {
    const stains = parseStains('rrrrbbb');
    const groups = [
      { color: BLUE, cells: row([0, 1, 2, 3]) },
      { color: BLUE, cells: row([4, 5, 6]) },
    ];
    expect(applyStains(stains, groups)).toEqual([[], row([4, 5, 6])]);
    expect(renderStains(stains)).toBe(board('bbbbbbb'));
  });
});

describe('stains in a match', () => {
  it('start clean and never touch the hidden rows', () => {
    const hidden = COLUMNS * RULES.hiddenRows;
    let stained = 0;
    for (let seed = 0; seed < 20; seed++) {
      const state = createState(seed);
      expect(state.stains).toEqual(new Array(COLUMNS * ROWS).fill(EMPTY));
      for (let ticks = 1; state.phase !== 'over' && ticks < 60000; ticks++) {
        step(state, (ticks * (seed + 13)) % 32);
        if (state.stains.slice(0, hidden).some((s) => s !== EMPTY))
          throw new Error(`seed ${seed} stained a hidden row`);
      }
      stained += state.stains.filter((s) => s !== EMPTY).length;
    }
    expect(stained).toBeGreaterThan(0);
  });

  it('stain the splatted cells and stay put while blobs fall past', () => {
    const { state } = dropLeft('.g.....\n.rrr...');
    // The green fell into the splat's gap; the stain stayed on the bottom row.
    expect(renderStains(state.stains)).toBe(board('rrrr...'));
    expect(state.grid.filter((c) => c !== EMPTY)).toHaveLength(2);
  });

  it('end each cell with the last splat color in a chain', () => {
    const { state, splats } = dropLeft(STAIRS);
    expect(splats.map((s) => s.chain)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(renderStains(state.stains)).toBe(STAIRS_STAINS);
  });
});

describe('stain matches', () => {
  const base = splatPoints([{ color: RED, cells: row([0, 1, 2, 3]) }], 1);

  it('score stainPoints per matching blob, before bonuses', () => {
    const { state, splats } = dropLeft('.rrr...', 'rr.b...');
    expect(splats[0].groups[0].matched).toEqual(row([0, 1]));
    expect(splats[0].points).toBe(base + 2 * RULES.scoring.stainPoints);
    expect(state.score).toBe(100);
    expect(renderStains(state.stains)).toBe(board('rrrr...'));
  });

  it('match every blob when the same color splats in the same place again', () => {
    const { state, splats } = dropLeft('.rrr...', 'rrrr...');
    expect(splats[0].groups[0].matched).toHaveLength(4);
    expect(state.score).toBe(120);
  });

  it('are multiplied by the chain bonus', () => {
    const plain = dropLeft(STAIRS).splats[1].points;
    // Step 2 splats the yellow column at col 2 on its own stains: 3 matches at 250%.
    const stained = dropLeft(STAIRS, '..y....\n..y....\n..y....').splats;
    expect(stained[1].groups[0].matched).toEqual([2, 1, 0].map((up) => ({ col: 2, row: BOTTOM - up })));
    expect(stained[1].points - plain).toBe((3 * RULES.scoring.stainPoints * 250) / 100);
    expect([plain, stained[1].points]).toEqual([200, 275]);
  });

  it('change nothing without matching stains', () => {
    const clean = dropLeft('.rrr...').state.score;
    expect(dropLeft('.rrr...', 'bbbbggg').state.score).toBe(clean);
    expect(clean).toBe(80);
  });
});

describe('stain fixtures', () => {
  it('round-trip a full layer', () => {
    const text = new Array(ROWS).fill('rygbp.r').join('\n');
    expect(renderStains(parseStains(text))).toBe(text);
  });

  it.each([
    ['an unknown letter', '...x...', /unknown letter "x"/],
    ['a short row', '......', /7 cells/],
  ])('reject %s', (_name, text, message) => {
    expect(() => parseStains(text)).toThrow(message);
  });
});
