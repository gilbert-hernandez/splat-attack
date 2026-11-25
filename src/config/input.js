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
