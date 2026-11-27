import { describe, expect, it } from 'vitest';
import { BOARD, RIVALS, RULES, TEXT, VIEW } from '../../src/config/index.js';
import { layoutFor, screenFor } from '../../src/layout/layout.js';
import { rivalLabel } from '../../src/match/ladder.js';

describe('screenFor', () => {
  it.each([
    [960, 540, 960, 540],
    [844, 390, 960, 540],
    [1000, 1000, 960, 540],
    [375, 667, 360, 640],
    [390, 844, 360, 778],
    [700, 900, 360, 640],
    [390, 664, 360, 640],
    [360, 1000, 360, 780],
    [999, 1000, 360, 640],
  ])('%ix%i gives %ix%i', (w, h, width, height) => {
    expect(screenFor(w, h)).toEqual({ orientation: width > height ? 'landscape' : 'portrait', width, height });
  });

  it.each([
    [0, 0],
    [0, 500],
    [500, 0],
    [NaN, NaN],
  ])('%ix%i gives nothing', (w, h) => expect(screenFor(w, h)).toBeNull());
});

const portrait = (height, mode = undefined) => layoutFor({ orientation: 'portrait', width: 360, height }, mode);
const landscape = (mode = undefined) => layoutFor({ orientation: 'landscape', width: 960, height: 540 }, mode);

/** The named rectangles of a match: areas, buttons, boards and next boxes. */
function rects(layout, mode) {
  const { areas = {}, buttons, [mode]: boards } = layout.match;
  const out = { ...areas };
  for (const [name, r] of Object.entries(buttons)) out[`button ${name}`] = r;
  for (const [name, board] of Object.entries(boards)) {
    if (name === 'gameOver' || name === 'choice') continue;
    if ('width' in board) {
      out[name] = board;
      continue;
    }
    const { x, y, scale, next } = board;
    const b = BOARD.frameBorder * scale;
    const size = BOARD.cell * scale;
    out[name] = {
      x: x - b,
      y: y - b,
      width: BOARD.columns * size + 2 * b,
      height: BOARD.rows * size + 2 * b,
    };
    for (let i = 0; next && i < RULES.nextPairs; i++) {
      out[`next${i}`] = { x: next.x, y: next.y + i * next.spacing, ...VIEW.nextBox };
    }
  }
  return Object.entries(out);
}

const inside = (r, o) => r.x >= o.x && r.y >= o.y && r.x + r.width <= o.x + o.width && r.y + r.height <= o.y + o.height;
const apart = (r, o) => r.x + r.width <= o.x || o.x + o.width <= r.x || r.y + r.height <= o.y || o.y + o.height <= r.y;
const BELOW = ['button ccw', 'button meter', 'button cw'];

/** Fails unless every rectangle is on the screen and none overlap, but the bottom buttons in `touch`. */
function expectApart(layout, mode, buttons = true) {
  const all = rects(layout, mode);
  const { width, height } = layout.screen;
  for (const [name, r] of all) {
    expect(inside(r, { x: 0, y: 0, width, height }), name).toBe(true);
    for (const [other, o] of all) {
      if (other === name || (other === 'touch' && BELOW.includes(name)) || (name === 'touch' && BELOW.includes(other)))
        continue;
      // The player's pending gunk and meter sit in the areas reserved for them.
      if ([name, other].includes('gunk') && [name, other].includes('pendingPlayer')) continue;
      if ([name, other].includes('meter') && [name, other].includes('meterPlayer')) continue;
      if (!buttons && [name, other].some((n) => n.startsWith('button '))) continue;
      expect(apart(r, o), `${name} and ${other}`).toBe(true);
    }
  }
  return Object.fromEntries(all);
}

describe.each([640, 700, 780])('portrait match at height %i', (height) => {
  it.each(['ladder', 'endless'])('%s: nothing overlaps or leaves the screen', (mode) => {
    for (const input of ['keyboard', 'touch']) {
      const all = expectApart(portrait(height, input), mode);
      expect(Object.keys(all)).toHaveLength(mode === 'ladder' ? 17 : 12);
      if (mode === 'ladder') expect(inside(all.pendingPlayer, all.gunk)).toBe(true);
      expect(all.meterPlayer).toEqual(all.meter);
    }
  });

  it('keeps the rotate buttons and meter slot centered in the touch area', () => {
    const { areas, buttons } = portrait(height).match;
    for (const name of ['ccw', 'meter', 'cw']) {
      const r = buttons[name];
      expect(inside(r, areas.touch), name).toBe(true);
      expect(r.y - areas.touch.y).toBe(areas.touch.y + areas.touch.height - (r.y + r.height));
    }
  });

  it('gives the extra height to the touch area and keeps the boards in place', () => {
    const { match } = portrait(height);
    expect(match.areas.touch.height).toBe(120 + height - 640);
    expect(match.ladder.player.y).toBe(portrait(640).match.ladder.player.y);
  });

  it('centers menus', () => {
    const layout = portrait(height);
    expect(layout.result.panel).toMatchObject({ x: 180, y: height / 2 });
    expect(layout.title.background).toMatchObject({ x: 180, y: height / 2 });
    expect(layout.title.version.y).toBe(height - 8);
  });
});

it('layouts never change the configuration', () => {
  portrait(780, 'touch');
  landscape('touch');
  expect(portrait(640).match.areas.touch.height).toBe(120);
  expect(portrait(640).match.buttons.cw.y).toBe(520);
  expect(landscape().match.ladder.player.x).toBe(64);
});

// In keyboard mode the buttons are hidden, so only touch mode must keep them clear.
describe('landscape match in touch mode', () => {
  it.each(['ladder', 'endless'])('%s: nothing overlaps or leaves the screen', (mode) => {
    const all = expectApart(landscape('touch'), mode);
    expect(Object.keys(all)).toHaveLength(mode === 'ladder' ? 13 : 8);
  });
});

describe('rival label', () => {
  // Monospace glyphs are about 0.6 em wide.
  const fits = ({ width, height, size, format }) => {
    const longest = Math.max(...RIVALS.map((r) => rivalLabel(r.number, format).length));
    return longest * size * 0.6 <= width && size <= height;
  };
  const layouts = [
    ['landscape keyboard', landscape('keyboard')],
    ['landscape touch', landscape('touch')],
    ...[640, 700, 780].flatMap((h) => [
      [`portrait ${h} keyboard`, portrait(h, 'keyboard')],
      [`portrait ${h} touch`, portrait(h, 'touch')],
    ]),
  ];

  it.each(layouts)('%s: fits the longest name and only Ladder has one', (_name, /** @type {any} */ layout) => {
    expect(fits(layout.match.ladder.rivalLabel)).toBe(true);
    expect(layout.match.endless.rivalLabel).toBeUndefined();
  });

  it('sits right above the rival in landscape and at the top of its column in portrait', () => {
    for (const layout of [landscape('keyboard'), landscape('touch')]) {
      const { rivalLabel: label, pendingRival } = layout.match.ladder;
      expect(label.y + label.height).toBeLessThanOrEqual(pendingRival.y);
      expect(label.x + label.width / 2).toBe(pendingRival.x + pendingRival.width / 2);
    }
    const { rivalLabel: label, rival } = portrait(640).match.ladder;
    expect(label.x).toBeLessThanOrEqual(rival.x);
    expect(label.x + label.width).toBeGreaterThanOrEqual(rival.x + BOARD.columns * BOARD.cell * rival.scale);
  });
});

describe('landscape pending gunk', () => {
  it.each(['keyboard', 'touch'])('sits right above its own board in %s mode', (input) => {
    // Keyboard mode hides the buttons, so they're left out there.
    const all = expectApart(landscape(input), 'ladder', input === 'touch');
    for (const [pending, board] of [
      ['pendingPlayer', 'player'],
      ['pendingRival', 'rival'],
    ]) {
      expect(all[pending].x).toBe(all[board].x + BOARD.frameBorder);
      expect(all[pending].y + all[pending].height).toBeLessThanOrEqual(all[board].y);
      expect(all[board].y - (all[pending].y + all[pending].height)).toBeLessThanOrEqual(8);
    }
    // Clear of the HUD's rows at the top center.
    const { ui } = landscape(input);
    expect(all.pendingPlayer.x + all.pendingPlayer.width).toBeLessThan(ui.score.x - 90);
    expect(all.pendingRival.x).toBeGreaterThan(ui.score.x + 90);
  });
});

/** A layout without its text sizes and the result's places, which touch mode changes in landscape. */
function withoutText(layout) {
  const strip = (part) => {
    if (typeof part !== 'object' || part === null) return part;
    const out = {};
    for (const [key, value] of Object.entries(part))
      if (!['size', 'wrap', 'spacing'].includes(key)) out[key] = strip(value);
    return out;
  };
  const { result: _result, ...rest } = layout;
  return strip(rest);
}

it('touch mode moves only the landscape Ladder boards, text and result', () => {
  const { touch, ...keyboard } = /** @type {any} */ (landscape('keyboard'));
  const touched = landscape('touch');
  expect(touched.mode).toBe('touch');
  expect(touched.match.ladder.player.x).toBe(136);
  expect(
    withoutText({ ...touched, mode: 'keyboard', match: { ...touched.match, ladder: keyboard.match.ladder } }),
  ).toEqual(withoutText(keyboard));
  // The result moves only up and down.
  for (const [name, place] of Object.entries(touched.result)) expect(place.x, name).toBe(keyboard.result[name].x);
  expect(touch).toBeUndefined();
  const { mode: _a, ...tallTouch } = portrait(700, 'touch');
  const { mode: _b, ...tallKeys } = portrait(700, 'keyboard');
  expect(tallTouch).toEqual(tallKeys);
});

describe('tap targets are at least 48 CSS px', () => {
  // CSS pixels per game pixel when the game fits a window.
  const fitScale = (w, h) => {
    const screen = screenFor(w, h);
    return { screen, scale: Math.min(w / screen.width, h / screen.height) };
  };
  it.each([
    [375, 553],
    [360, 640],
    [568, 320],
    [667, 331],
  ])('at %ix%i', (w, h) => {
    const { screen, scale } = fitScale(w, h);
    for (const [name, r] of Object.entries(layoutFor(screen, 'touch').match.buttons)) {
      expect(Math.min(r.width, r.height) * scale, name).toBeGreaterThanOrEqual(48);
    }
  });
});

it('both orientations place the same things', () => {
  const wide = landscape();
  const tall = portrait(640);
  for (const key of Object.keys(wide)) {
    if (typeof wide[key] !== 'object') continue;
    const names = (layout) =>
      Object.keys(layout[key])
        .filter((name) => name !== 'areas')
        .sort();
    expect(names(tall), key).toEqual(names(wide));
  }
});

describe('text is readable on the smallest windows', () => {
  // Every place that shows text, by part. The debug hint is for developers and exempt.
  const TEXTS = {
    preload: ['text'],
    title: ['logo', 'start', 'hint', 'version'],
    modeSelect: ['heading', 'ladder', 'endless', 'back'],
    pause: ['heading', 'resume', 'quit'],
    result: ['heading', 'mode', 'score', 'stats', 'again', 'title'],
    ui: ['mode', 'score', 'level'],
  };
  /** @type {['portrait' | 'landscape', import('../../src/layout/layout.js').Mode][]} */
  const cases = [
    ['portrait', 'keyboard'],
    ['portrait', 'touch'],
    ['landscape', 'touch'],
  ];
  it.each(cases)('%s in %s mode', (orientation, mode) => {
    const [w, h] = TEXT.smallestWindows[orientation];
    const screen = screenFor(w, h);
    expect(screen?.orientation).toBe(orientation);
    const scale = Math.min(w / screen.width, h / screen.height);
    const layout = layoutFor(screen, mode);
    for (const [part, names] of Object.entries(TEXTS)) {
      for (const name of names) {
        const { size } = layout[part][name];
        expect(size, `${part}.${name}`).toBeGreaterThan(0);
        expect(size * scale, `${part}.${name}`).toBeGreaterThanOrEqual(TEXT.minCssPx);
      }
    }
  });

  it('keyboard landscape keeps its sizes', () => {
    const { title, ui, result } = landscape('keyboard');
    expect([title.hint.size, title.start.size, ui.score.size, result.stats.size]).toEqual([14, 18, 20, 16]);
  });
});

describe('meter places', () => {
  it.each(['keyboard', 'touch'])('sit right below their own boards in landscape %s mode', (input) => {
    for (const mode of ['ladder', 'endless']) {
      const all = expectApart(landscape(input), mode, input === 'touch');
      const pairs = mode === 'ladder' ? [['meterPlayer', 'player'], ['meterRival', 'rival']] : [['meterPlayer', 'player']]; // prettier-ignore
      for (const [meter, board] of pairs) {
        const b = all[board];
        const m = all[meter];
        expect(m.x + m.width / 2, meter).toBe(b.x + b.width / 2);
        expect(m.y).toBeGreaterThanOrEqual(b.y + b.height);
        expect(m.y - (b.y + b.height)).toBeLessThanOrEqual(8);
      }
      expect(all.meterPlayer.y + all.meterPlayer.height).toBeLessThan(landscape().match.debugHint.y - 6);
    }
  });

  it('put the choice panel over the player board, inside the screen', () => {
    for (const layout of [landscape(), landscape('touch'), portrait(640), portrait(780)]) {
      const { width, height } = layout.screen;
      for (const mode of ['ladder', 'endless']) {
        const { choice, player } = layout.match[mode];
        const right = player.x + BOARD.columns * BOARD.cell * player.scale;
        expect(choice.x).toBe((player.x + right) / 2);
        expect(choice.y).toBeGreaterThan(player.y);
        expect(choice.y).toBeLessThan(player.y + 100);
        expect(choice.x > 0 && choice.x < width && choice.y < height).toBe(true);
      }
    }
  });
});
