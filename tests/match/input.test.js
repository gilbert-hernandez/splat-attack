import { describe, expect, it } from 'vitest';
import { CONTROLS } from '../../src/config/input.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import MatchInput from '../../src/match/input.js';

const { LEFT, RIGHT, ROTATE_CW, ROTATE_CCW, SOFT_DROP } = INPUT;
const { repeatDelay, repeatInterval } = CONTROLS;

/** Ticks (from 0) on which a bit is set. */
function ticksWith(input, bit, count) {
  const hits = [];
  for (let i = 0; i < count; i++) if (input.next() & bit) hits.push(i);
  return hits;
}

function pressed(...codes) {
  const input = new MatchInput();
  for (const code of codes) input.press(code);
  return input;
}

describe('match input', () => {
  it.each([
    ['KeyA', LEFT],
    ['ArrowLeft', LEFT],
    ['KeyD', RIGHT],
    ['ArrowRight', RIGHT],
    ['KeyS', SOFT_DROP],
    ['ArrowDown', SOFT_DROP],
    ['KeyE', ROTATE_CW],
    ['KeyX', ROTATE_CW],
    ['KeyQ', ROTATE_CCW],
    ['KeyZ', ROTATE_CCW],
    ['Space', 0],
    ['constructor', 0],
  ])('%s gives %i', (code, mask) => {
    expect(pressed(code).next()).toBe(mask);
  });

  it.each([
    ['KeyA', LEFT],
    ['KeyE', ROTATE_CW],
  ])('a tap of %s between ticks acts once', (code, bit) => {
    const input = pressed(code);
    input.release(code);
    expect(ticksWith(input, bit, 40)).toEqual([0]);
  });

  it('repeats a held move after the delay', () => {
    const expected = [0, repeatDelay, repeatDelay + repeatInterval, repeatDelay + 2 * repeatInterval];
    expect(ticksWith(pressed('KeyA'), LEFT, repeatDelay + 2 * repeatInterval + 1)).toEqual(expected);
  });

  it('rotates once per press, and ignores repeated or doubled presses', () => {
    const input = pressed('KeyE', 'KeyE');
    expect(ticksWith(input, ROTATE_CW, 20)).toEqual([0]);
    input.press('KeyE');
    expect(input.next()).toBe(0);
    input.release('KeyE');
    input.press('KeyE');
    expect(input.next()).toBe(ROTATE_CW);
  });

  it('ignores repeated presses of a held move', () => {
    const input = pressed('KeyA');
    input.next();
    input.press('KeyA');
    expect(input.next()).toBe(0);
  });

  it('drops while held', () => {
    const input = pressed('KeyS');
    expect(ticksWith(input, SOFT_DROP, 3)).toEqual([0, 1, 2]);
    input.release('KeyS');
    expect(input.next()).toBe(0);
  });

  it('keeps moving when one of two keys for a move is released', () => {
    const input = pressed('KeyA', 'ArrowLeft');
    ticksWith(input, LEFT, repeatDelay);
    input.release('ArrowLeft');
    expect(input.next()).toBe(LEFT);
  });

  it('lets the last direction win, then returns to the other with a new delay', () => {
    const input = pressed('KeyA');
    ticksWith(input, LEFT, repeatDelay + 5);
    input.press('KeyD');
    expect(input.next()).toBe(RIGHT);
    ticksWith(input, RIGHT, repeatDelay);
    input.release('KeyD');
    expect(ticksWith(input, LEFT, repeatDelay)).toEqual([repeatDelay - 1]);
    expect(pressed('KeyA', 'KeyD').next()).toBe(RIGHT);
  });

  it('keeps its repeat through a settle, but not taps', () => {
    const state = createState(5);
    const phase = () => state.phase;
    const input = pressed('KeyS');
    while (phase() === 'falling') step(state, input.next());
    input.release('KeyS');
    input.press('KeyA');
    input.press('KeyE');
    input.release('KeyE');
    while (phase() !== 'falling') step(state, input.next());
    const col = state.pair.col;
    for (let i = 0; i < repeatInterval; i++) step(state, input.next());
    expect(state.pair.col).toBe(col - 1);
    expect(state.pair.orientation).toBe(0);
  });

  it('forgets everything on releaseAll', () => {
    const input = pressed('KeyA', 'KeyE', 'KeyS');
    input.releaseAll();
    expect(ticksWith(input, 31, 40)).toEqual([]);
  });
});
