import { expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { pendingIcons } from '../../src/view/PendingView.js';

const [L, M, S] = ['ui_gunk_large', 'ui_gunk_medium', 'ui_gunk_small'];

it('sizes a full drop and a row as the rules do', () => {
  expect([RULES.attack.maxDrop, RULES.columns]).toEqual([28, 7]);
});

it.each([
  [0, []],
  [1, [S]],
  [7, [M]],
  [10, [M, S, S, S]],
  [28, [L]],
  [40, [L, M, S, S, S, S]],
  [200, [L, L, L, L, L, L]],
])('shows %i pending as %j', (count, keys) => {
  expect(pendingIcons(count, 6)).toEqual(keys);
});

it('stops at the most icons that fit', () => {
  expect(pendingIcons(13, 4)).toEqual([M, S, S, S]);
});
