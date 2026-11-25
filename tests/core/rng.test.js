import { describe, expect, it } from 'vitest';
import { nextInt, nextUint32, seedRng } from '../../src/core/rng.js';

const take = (seed, count, draw) => {
  let rng = seedRng(seed);
  return Array.from({ length: count }, () => {
    const result = draw(rng);
    rng = result.rng;
    return result.value;
  });
};

describe('rng', () => {
  it('matches the reference mulberry32', () => {
    // The published float version, as an independent check.
    const reference = (a) => () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (t ^ (t >>> 14)) >>> 0;
    };
    for (const seed of [0, 1, 123456789, 0xffffffff]) {
      const expected = Array.from({ length: 50 }, reference(seed));
      expect(take(seed, 50, nextUint32)).toEqual(expected);
    }
  });

  it('keeps its known values', () => {
    expect(take(1, 3, nextUint32)).toMatchInlineSnapshot(`
      [
        2693262067,
        11749833,
        2265367787,
      ]
    `);
  });

  it('is evenly spread', () => {
    const counts = [0, 0, 0, 0, 0];
    for (const v of take(7, 50000, (rng) => nextInt(rng, 5))) counts[v]++;
    for (const count of counts) expect(Math.abs(count - 10000)).toBeLessThan(400);
  });

  it('redraws values that would bias the range', () => {
    // With n = 2^31 + 1 almost half of all values are past the last full multiple.
    const n = 0x80000001;
    const raw = take(3, 200, nextUint32);
    const kept = raw.filter((v) => v < n);
    expect(kept.length).toBeLessThan(150);
    expect(take(3, kept.length, (rng) => nextInt(rng, n))).toEqual(kept);
  });

  it.each([-1, 0.5, 2 ** 32, NaN, '1', undefined])('rejects the seed %s', (seed) => {
    expect(() => seedRng(/** @type {any} */ (seed))).toThrow(String(seed));
  });
});
