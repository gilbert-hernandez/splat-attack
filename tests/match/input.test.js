import { describe, expect, it } from 'vitest';
import { CONTROLS } from '../../src/config/input.js';
import { INPUT, createState, step } from '../../src/core/engine.js';
import TouchGestures from '../../src/match/gestures.js';
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

describe('rotate buttons', () => {
  it.each([
    ['cw', ROTATE_CW],
    ['ccw', ROTATE_CCW],
  ])('%s acts once on the next tick', (action, bit) => {
    const input = new MatchInput();
    input.turn(/** @type {'cw' | 'ccw'} */ (action));
    expect(ticksWith(input, bit, 40)).toEqual([0]);
  });

  it('combines with keys and with the other button', () => {
    const input = pressed('KeyA', 'KeyS');
    input.turn('cw');
    input.turn('ccw');
    expect(input.next()).toBe(LEFT | SOFT_DROP | ROTATE_CW | ROTATE_CCW);
    expect(input.next() & (ROTATE_CW | ROTATE_CCW)).toBe(0);
  });

  it('combines with a drag', () => {
    const input = new MatchInput();
    const touch = new TouchGestures();
    touch.begin(1, 100, 100, 1);
    touch.move(1, 130, 102);
    input.turn('ccw');
    expect(input.next() | touch.next()).toBe(RIGHT | ROTATE_CCW);
    expect(input.next() | touch.next()).toBe(0);
  });

  it('is dropped by releaseAll', () => {
    const input = new MatchInput();
    input.turn('cw');
    input.releaseAll();
    expect(input.next()).toBe(0);
  });
});

describe('meter choice', () => {
  const { RINSE, BOMB } = INPUT;
  const MOVES = LEFT | RIGHT | ROTATE_CW | ROTATE_CCW;

  /** An input whose board has a full meter (unless told otherwise) and gunk pending. */
  function choosing({ full = true, pending = true } = {}) {
    const opened = [];
    const input = new MatchInput({ canOpen: () => full, canRinse: () => pending, onOpen: () => opened.push(1) });
    return { input, opened };
  }

  it('does nothing on Space while the meter is not full', () => {
    const { input, opened } = choosing({ full: false });
    input.press('Space');
    expect(input.choice.open).toBe(false);
    expect(opened).toEqual([]);
    expect(input.next()).toBe(0);
  });

  it.each([
    ['KeyD', BOMB],
    ['ArrowRight', BOMB],
    ['KeyE', BOMB],
    ['KeyX', BOMB],
    ['KeyA', RINSE],
    ['ArrowLeft', RINSE],
    ['KeyQ', RINSE],
    ['KeyZ', RINSE],
  ])('picks with %s, without moving or rotating', (code, bit) => {
    const { input, opened } = choosing();
    input.press('Space');
    expect(opened).toEqual([1]);
    input.release('Space');
    input.press(code);
    expect(input.choice.open).toBe(false);
    expect(input.next()).toBe(bit);
    // Still held after the pick: never acts.
    for (let i = 0; i < 40; i++) expect(input.next() & (MOVES | RINSE | BOMB)).toBe(0);
    input.release(code);
    input.press(code);
    expect(input.next() & MOVES).not.toBe(0);
  });

  it('closes on a second Space without firing', () => {
    const { input } = choosing();
    input.press('Space');
    input.release('Space');
    input.press('Space');
    expect(input.choice.open).toBe(false);
    input.press('KeyD');
    expect(input.next()).toBe(RIGHT);
  });

  it('stops a held move key, which picks nothing until pressed again', () => {
    const { input } = choosing();
    input.press('ArrowLeft');
    expect(input.next()).toBe(LEFT);
    input.press('Space');
    expect(ticksWith(input, LEFT | RINSE | BOMB, 60)).toEqual([]);
  });

  it('keeps soft drop working', () => {
    const { input } = choosing();
    input.press('KeyS');
    input.press('Space');
    expect(input.next()).toBe(SOFT_DROP);
    input.release('KeyS');
    input.press('ArrowDown');
    expect(input.next()).toBe(SOFT_DROP);
  });

  it('ignores Rinse while nothing is pending, staying open', () => {
    const { input } = choosing({ pending: false });
    input.press('Space');
    input.press('KeyQ');
    expect(input.choice.open).toBe(true);
    expect(input.next()).toBe(0);
    input.press('KeyE');
    expect(input.next()).toBe(BOMB);
  });

  it('closes by itself after choiceTicks', () => {
    const { input } = choosing();
    input.press('Space');
    for (let i = 0; i < CONTROLS.choiceTicks - 1; i++) input.next();
    expect(input.choice.open).toBe(true);
    input.next();
    expect(input.choice.open).toBe(false);
    input.press('KeyD');
    expect(input.next()).toBe(RIGHT);
  });

  it('is closed by releaseAll without a pick', () => {
    const { input } = choosing();
    input.press('Space');
    input.releaseAll();
    expect(input.choice.open).toBe(false);
    expect(input.next()).toBe(0);
  });

  it('picks from buttons once and holds back rotate buttons', () => {
    const { input } = choosing();
    input.openChoice();
    input.turn('cw');
    expect(input.next()).toBe(0);
    input.openChoice();
    input.pick('bomb');
    expect([input.next(), input.next()]).toEqual([BOMB, 0]);
  });
});
