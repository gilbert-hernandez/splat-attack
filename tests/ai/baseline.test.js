import { describe, expect, it } from 'vitest';
import { createRival, rivalInput } from '../../src/ai/rival.js';
import { createSparring, sparringInput } from '../../src/ai/sparring.js';
import { createVersus, stepVersus } from '../../src/core/versus.js';

// The SA-10 rivals, pinned: with their variety off (`plain`), each rival must play exactly as it did
// before SA-11, move for move. The variety checks in `npm run sim -- --variety` compare against this
// baseline. The hashes were recorded on the SA-10 code.

const SEED = 7;
const MAX_TICKS = 36000;

const PINNED = {
  rival1: '26642:86534d23',
  rival2: '16245:9572af56',
  rival3: '13642:bdc439e0',
  rival4: '4990:f8225d0f',
  rival5: '3011:4ebe003c',
};

/** A hash of every tick's input for a plain rival's whole match against the sparring rival. */
function baselineHash(id) {
  const match = createVersus(SEED);
  const bot = createRival(id, SEED, { plain: true });
  const sparring = createSparring();
  let hash = 0x811c9dc5;
  while (match.outcome === null && match.tick < MAX_TICKS) {
    const input = rivalInput(bot, match.boards[1], match.boards[0]);
    hash = Math.imul(hash ^ input, 0x01000193) >>> 0;
    stepVersus(match, sparringInput(sparring, match.boards[0]), input);
  }
  return `${match.tick}:${hash.toString(16)}`;
}

describe('plain rivals play as in SA-10', () => {
  it.each(Object.keys(PINNED))('%s', { timeout: 120000 }, (id) => {
    expect(baselineHash(id)).toBe(PINNED[id]);
  });
});
