// Seeded random numbers (mulberry32). The state is one uint32, so it lives in the match state.

/**
 * @param {number} seed
 * @returns {number} the initial RNG state
 */
export function seedRng(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error(`Seed must be an unsigned 32-bit integer, got ${String(seed)}`);
  }
  return seed;
}

/**
 * @param {number} rng state
 * @returns {{rng: number, value: number}} the next state and a uint32
 */
export function nextUint32(rng) {
  const next = (rng + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), next | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { rng: next, value: (t ^ (t >>> 14)) >>> 0 };
}

/**
 * An unbiased integer in [0, n): values past the last full multiple of n are redrawn.
 * @param {number} rng state
 * @param {number} n
 */
export function nextInt(rng, n) {
  const limit = Math.floor(0x100000000 / n) * n;
  let draw = nextUint32(rng);
  while (draw.value >= limit) draw = nextUint32(draw.rng);
  return { rng: draw.rng, value: draw.value % n };
}
