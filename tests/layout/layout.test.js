import { describe, expect, it } from 'vitest';
import { BOARD, RULES, VIEW } from '../../src/config/index.js';
import { layoutFor, screenFor } from '../../src/layout/layout.js';

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

const portrait = (height) => layoutFor({ orientation: 'portrait', width: 360, height });

/** The named rectangles of a portrait match. */
function rects(layout, mode) {
  const { areas, [mode]: boards } = layout.match;
  const out = { ...areas };
  for (const [name, board] of Object.entries(boards)) {
    if (name === 'gameOver') continue;
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

describe.each([640, 700, 780])('portrait match at height %i', (height) => {
  it.each(['ladder', 'endless'])('%s: nothing overlaps or leaves the screen', (mode) => {
    const all = rects(portrait(height), mode);
    expect(all.map(([name]) => name)).toHaveLength(mode === 'ladder' ? 9 : 8);
    for (const [name, r] of all) {
      expect(r.x >= 0 && r.y >= 0 && r.x + r.width <= 360 && r.y + r.height <= height, name).toBe(true);
      for (const [other, o] of all) {
        if (other === name) continue;
        const apart = r.x + r.width <= o.x || o.x + o.width <= r.x || r.y + r.height <= o.y || o.y + o.height <= r.y;
        expect(apart, `${name} and ${other}`).toBe(true);
      }
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
  portrait(780);
  expect(portrait(640).match.areas.touch.height).toBe(120);
});

it('both orientations place the same things', () => {
  const landscape = layoutFor({ orientation: 'landscape', width: 960, height: 540 });
  const tall = portrait(640);
  for (const key of Object.keys(landscape)) {
    const names = (layout) =>
      Object.keys(layout[key])
        .filter((name) => name !== 'areas')
        .sort();
    expect(names(tall), key).toEqual(names(landscape));
  }
});
