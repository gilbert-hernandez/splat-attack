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
    Space: 'meter',
  },
  // While the meter choice is open, these actions pick instead: the left-hand keys Rinse, the
  // right-hand keys Bomb.
  choiceKeys: { left: 'rinse', ccw: 'rinse', right: 'bomb', cw: 'bomb' },
  // The meter choice closes by itself after this many ticks.
  choiceTicks: 120,
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
