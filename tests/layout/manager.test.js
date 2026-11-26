import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { screenFor } from '../../src/layout/layout.js';
import LayoutManager, { onLayout } from '../../src/layout/manager.js';

/** Like Phaser's: setting the game size reports a resize. */
class Scale extends EventEmitter {
  constructor(width, height) {
    super();
    this.parentSize = { width, height };
    this.setGameSize = vi.fn(() => this.emit('resize'));
  }

  window(width, height) {
    this.parentSize = { width, height };
    this.emit('resize');
  }
}

function make(width = 960, height = 540) {
  const scale = new Scale(width, height);
  const manager = new LayoutManager(scale, screenFor(width, height));
  const events = new EventEmitter();
  const scene = /** @type {any} */ ({ registry: new Map([['layout', manager]]), events });
  const place = vi.fn();
  onLayout(scene, place);
  return { scale, manager, events, place };
}

describe('LayoutManager', () => {
  it('places a scene at once, not rotated', () => {
    const { manager, place } = make();
    expect(place.mock.calls).toEqual([[manager.layout, false]]);
  });

  it('changes once per window change', () => {
    const { scale, place } = make();
    scale.window(375, 667);
    expect(scale.setGameSize.mock.calls).toEqual([[360, 640]]);
    expect(place).toHaveBeenCalledTimes(2);
    expect(place.mock.lastCall[0].screen).toEqual({ orientation: 'portrait', width: 360, height: 640 });
    expect(place.mock.lastCall[1]).toBe(true);
    scale.emit('resize');
    expect(place).toHaveBeenCalledTimes(2);
  });

  it('keeps its layout when the window changes but the screen does not', () => {
    const { scale, place } = make();
    scale.window(1400, 600);
    scale.window(0, 0);
    expect(scale.setGameSize).not.toHaveBeenCalled();
    expect(place).toHaveBeenCalledTimes(1);
  });

  it('is not rotated by a height change', () => {
    const { scale, place } = make(390, 844);
    scale.window(390, 760);
    expect(place.mock.lastCall[0].screen.height).toBe(700);
    expect(place.mock.lastCall[1]).toBe(false);
  });

  it('tells listeners once, as rotated, if the size changes again during the change', () => {
    const { scale, place } = make();
    scale.setGameSize.mockImplementationOnce(() => {
      scale.window(390, 844);
      return true;
    });
    scale.window(375, 667);
    expect(place).toHaveBeenCalledTimes(2);
    expect(place.mock.lastCall[0].screen.height).toBe(778);
    expect(place.mock.lastCall[1]).toBe(true);
  });

  it('switches mode without rotating, and keeps it through window changes', () => {
    const { scale, manager, place } = make();
    manager.setMode('touch');
    manager.setMode('touch');
    expect(place).toHaveBeenCalledTimes(2);
    expect(place.mock.lastCall).toEqual([manager.layout, false]);
    expect(manager.layout.mode).toBe('touch');
    expect(manager.layout.match.ladder.player.x).toBe(136);
    scale.window(375, 667);
    expect(place.mock.lastCall[0]).toMatchObject({ mode: 'touch', screen: { orientation: 'portrait' } });
    expect(scale.setGameSize).toHaveBeenCalledTimes(1);
  });

  it('forgets a scene at shutdown', () => {
    const { scale, manager, events, place } = make();
    events.emit('shutdown');
    scale.window(375, 667);
    expect(place).toHaveBeenCalledTimes(1);
    expect(manager.listeners.size).toBe(0);
  });
});
