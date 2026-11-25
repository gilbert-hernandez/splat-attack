import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MANIFEST, asset, keyFor, validate } from '../src/assets/manifest.js';

const assetsMd = readFileSync(new URL('../ASSETS.md', import.meta.url), 'utf8');

/** Rows of the ASSETS.md tables: | Ticket | `file` | W×H | frames | notes | */
function parseAssetsTable(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(SA-\d+)\s*\|\s*`([^`]+)`\s*\|\s*(\d+)×(\d+)\s*\|\s*(\d+)\s*\|/);
    if (m) rows.push({ ticket: m[1], file: m[2], frameWidth: +m[3], frameHeight: +m[4], frames: +m[5] });
  }
  return rows;
}
const signature = (e) => `${e.ticket} ${e.file} ${e.frameWidth}x${e.frameHeight} x${e.frames}`;

describe('asset manifest', () => {
  it('is valid', () => {
    expect(validate()).toEqual([]);
  });

  it('derives keys from file names', () => {
    for (const e of MANIFEST) expect(e.key).toBe(keyFor(e.file));
  });

  it('declares the red blob idle as a 4-frame 32x32 sheet', () => {
    expect(asset('blob_red_idle')).toMatchObject({ type: 'spritesheet', frameWidth: 32, frameHeight: 32, frames: 4 });
  });

  it('throws on unknown keys', () => {
    expect(() => asset('nope')).toThrow(/Unknown asset key/);
  });

  it('matches ASSETS.md exactly (tickets, files, sizes, frame counts)', () => {
    expect(parseAssetsTable(assetsMd).map(signature).sort()).toEqual(MANIFEST.map(signature).sort());
  });
});

describe('validate() names the bad entry', () => {
  const bad = (changes) => validate([{ ...MANIFEST[0], ...changes }]).join('\n');

  it('duplicate key and file', () => {
    const errors = validate([MANIFEST[0], MANIFEST[0]]).join('\n');
    expect(errors).toContain(`duplicate key "${MANIFEST[0].key}"`);
    expect(errors).toContain(`duplicate file "${MANIFEST[0].file}"`);
  });

  it.each([
    ['prefix', { file: 'blob_red.png' }, /bad file name "blob_red.png"/],
    ['size', { frameWidth: 0 }, /blob_red_idle.*frame size/],
    ['frames', { frames: 0 }, /blob_red_idle.*frames must be/],
    ['type', { type: 'x' }, /unknown type/],
    ['category', { category: 'x' }, /unknown category/],
    ['image frames', { type: 'image' }, /exactly 1 frame/],
  ])('%s', (_name, changes, message) => {
    expect(bad(changes)).toMatch(message);
  });
});
