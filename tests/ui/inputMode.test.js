import { describe, expect, it } from 'vitest';
import InputMode from '../../src/ui/inputMode.js';

/** @param {import('../../src/ui/inputMode.js').Mode} [start] */
function make(start = 'keyboard') {
  const changes = [];
  const mode = new InputMode(start, ['KeyA', 'Enter'], (m) => changes.push(m));
  return { mode, changes };
}

describe('input mode', () => {
  it.each(/** @type {const} */ (['touch', 'keyboard']))('starts in %s', (start) => {
    expect(make(start).mode.mode).toBe(start);
  });

  it('a touch switches to touch, once', () => {
    const { mode, changes } = make();
    mode.touchStart(1);
    mode.touchStart(2);
    expect(mode.mode).toBe('touch');
    expect(changes).toEqual(['touch']);
  });

  it('a game key or mouse press switches to keyboard when no finger is down', () => {
    const { mode, changes } = make('touch');
    mode.key('KeyA');
    expect(mode.mode).toBe('keyboard');
    mode.touchStart(1);
    mode.touchEnd(0);
    mode.mousePress();
    expect(changes).toEqual(['keyboard', 'touch', 'keyboard']);
  });

  it('other keys change nothing', () => {
    const { mode, changes } = make('touch');
    mode.key('AudioVolumeUp');
    mode.key('Unidentified');
    expect(mode.mode).toBe('touch');
    expect(changes).toEqual([]);
  });

  it('nothing switches to keyboard while a finger is down', () => {
    const { mode, changes } = make();
    mode.touchStart(1);
    mode.touchStart(2);
    mode.key('KeyA');
    mode.mousePress();
    mode.touchEnd(1);
    mode.key('Enter');
    expect(mode.mode).toBe('touch');
    mode.touchEnd(0);
    mode.key('Enter');
    expect(changes).toEqual(['touch', 'keyboard']);
  });

  it('losing focus forgets fingers', () => {
    const { mode } = make();
    mode.touchStart(1);
    mode.blur();
    mode.key('KeyA');
    expect(mode.mode).toBe('keyboard');
  });
});
