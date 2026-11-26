import { describe, expect, it } from 'vitest';
import { COLORS, MANIFEST, asset } from '../src/assets/manifest.js';
import { CATEGORY_COLORS, drawPlaceholderCanvas, shade, shapeSpans } from '../src/assets/placeholders.js';
import { BOARD } from '../src/config/index.js';

// Minimal stand-in for document/canvas that records fillRect calls.
const fakeDoc = {
  createElement: () => {
    const calls = [];
    return {
      width: 0,
      height: 0,
      calls,
      getContext: () => ({
        fillStyle: '',
        fillRect(x, y, w, h) {
          calls.push({ x, y, w, h, color: this.fillStyle });
        },
      }),
    };
  },
};
/** @param {any} entry @returns {any} */
const draw = (entry) => drawPlaceholderCanvas(entry, /** @type {any} */ (fakeDoc));

describe('placeholders', () => {
  it('has a color for every category', () => {
    for (const e of MANIFEST) expect(CATEGORY_COLORS[e.category]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('matches the declared size and stays inside the canvas', () => {
    for (const e of MANIFEST) {
      const c = draw(e);
      expect([c.width, c.height]).toEqual([e.frameWidth * e.frames, e.frameHeight]);
      for (const r of c.calls) {
        expect(Math.min(r.x, r.y), e.key).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w, e.key).toBeLessThanOrEqual(c.width);
        expect(r.y + r.h, e.key).toBeLessThanOrEqual(c.height);
      }
    }
  });

  it('gives every blob color clearly different pixels by shape alone', () => {
    const pixels = (shape) => {
      const set = new Set();
      for (const s of shapeSpans(shape, 32)) for (let x = s.x; x < s.x + s.w; x++) set.add(`${x},${s.y}`);
      return set;
    };
    for (const a of COLORS) {
      for (const b of COLORS) {
        if (a === b) continue;
        const [pa, pb] = [pixels(a.shape), pixels(b.shape)];
        const different = [...pa].filter((p) => !pb.has(p)).length + [...pb].filter((p) => !pa.has(p)).length;
        expect(different, `${a.name} vs ${b.name}`).toBeGreaterThan(100);
      }
    }
  });

  it('marks each stain with its color shape, so stains differ without hue', () => {
    /** The pixels drawn in the mark's color, as "x,y". */
    const mark = (name) => {
      const calls = draw(asset(`stain_${name}`)).calls;
      const set = new Set();
      for (const r of calls.slice(1)) for (let x = r.x; x < r.x + r.w; x++) set.add(`${x},${r.y}`);
      return set;
    };
    for (const a of COLORS) {
      for (const b of COLORS) {
        if (a === b) continue;
        const [pa, pb] = [mark(a.name), mark(b.name)];
        const different = [...pa].filter((p) => !pb.has(p)).length + [...pb].filter((p) => !pa.has(p)).length;
        expect(different, `${a.name} vs ${b.name}`).toBeGreaterThan(10);
      }
    }
  });

  it('draws whole and cracked gunk differently from each other and from every blob, without hue', () => {
    /** Pixels by shade: the grayscale picture, as "x,y=color" with the tile color left out. */
    const picture = (key) => {
      const { calls } = draw(asset(key));
      const set = new Set();
      for (const r of calls) {
        // The first frame only.
        for (let y = r.y; y < r.y + r.h; y++) {
          for (let x = r.x; x < Math.min(32, r.x + r.w); x++) set.add(`${x},${y}=${r.color}`);
        }
      }
      return set;
    };
    const differ = (a, b) => [...a].filter((p) => !b.has(p)).length + [...b].filter((p) => !a.has(p)).length;
    const whole = picture('gunk_whole');
    const cracked = picture('gunk_cracked');
    expect(differ(whole, cracked)).toBeGreaterThan(60);
    // Gunk fills its whole cell; blobs are shapes on a clear background.
    const covered = (set) => new Set([...set].map((p) => p.split('=')[0])).size;
    expect(covered(whole)).toBe(32 * 32);
    expect(covered(cracked)).toBe(32 * 32);
    for (const { name } of COLORS) expect(covered(picture(`blob_${name}_idle`)), name).toBeLessThan(32 * 32 - 100);
  });

  it('draws a stain as a dim full tile, unlike its bright blob shape', () => {
    for (const { name, color } of COLORS) {
      const [tile, ...mark] = draw(asset(`stain_${name}`)).calls;
      expect(tile).toEqual({ x: 0, y: 0, w: 32, h: 32, color: shade(color, 0.6) });
      expect(mark.every((r) => r.color !== color && r.color !== tile.color)).toBe(true);
      // The blob has no full tile; its first span is narrower than the cell.
      const [first] = draw(asset(`blob_${name}_idle`)).calls;
      expect([first.w < 32, first.color]).toEqual([true, color]);
    }
  });

  it('leaves the board frame opening clear and sized to the board', () => {
    const e = asset('board_frame_player');
    const { columns, rows, cell, frameBorder: b } = BOARD;
    expect([e.frameWidth - 2 * b, e.frameHeight - 2 * b]).toEqual([columns * cell, rows * cell]);
    const inside = (r) => r.x < e.frameWidth - b && r.x + r.w > b && r.y < e.frameHeight - b && r.y + r.h > b;
    expect(draw(e).calls.some(inside)).toBe(false);
  });

  it('darkens colors', () => {
    expect(shade('#ffffff', 0.5)).toBe('#808080');
  });
});
