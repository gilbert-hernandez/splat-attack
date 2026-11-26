// Controls, by key position (KeyboardEvent.code). Times are in ticks.
export const CONTROLS = {
  keys: {
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    KeyS: 'drop',
    ArrowDown: 'drop',
    KeyE: 'cw',
    KeyX: 'cw',
    KeyQ: 'ccw',
    KeyZ: 'ccw',
  },
  // Menu keys. These and the match keys switch to keyboard mode; others (such as a phone's volume) don't.
  menuKeys: ['Enter', 'NumpadEnter', 'Space', 'Escape'],
  // Keys the browser would scroll with.
  captured: 'LEFT,RIGHT,UP,DOWN,SPACE',
  repeatDelay: 10,
  repeatInterval: 3,
};

export const CLOCK = {
  ticksPerSecond: 60,
  // After a stall, ticks past this are dropped.
  maxTicksPerFrame: 5,
};
