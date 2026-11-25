// Display and debug tunables.
export const DISPLAY = {
  width: 960,
  height: 540,
  backgroundColor: '#14121f',
};

export const DEBUG = {
  // Scene labels and dev keys in a match. On in `npm run dev`, off in builds.
  enabled: import.meta.env?.DEV ?? false,
  // Match keys, by position (KeyboardEvent.code).
  keys: {
    Digit1: 'color1',
    Digit2: 'color2',
    Digit3: 'color3',
    Digit4: 'color4',
    Digit5: 'color5',
    KeyB: 'board',
    KeyP: 'freeze',
    Period: 'step',
    KeyF: 'fast',
    KeyR: 'end',
  },
  hint: '1-5 twice: next pair · B board · P freeze · . step · F fast · R end',
  fastRate: 8,
};
