// Menu and scene-flow tunables.
export const FLOW = {
  fontFamily: 'monospace',
  textColor: '#ffffff',
  mutedColor: '#9ca3af',
  buttonTints: { normal: 0x4c4670, hover: 0x7d6fc4, pressed: 0x342f52 },
  panelTint: 0x3a3558,
  // Esc is ignored this long after Pause opens, so one press can't open and close it.
  pauseInputDelayMs: 150,
  // The final board stays this many ticks before the result.
  gameOverTicks: 90,
  // Result keys and touches are ignored this long, so input mashed at the end doesn't skip it.
  resultInputDelayMs: 500,
  // The title's controls, for the input mode.
  hints: {
    keyboard: 'A/D or ←/→ move · S or ↓ drop · Q/E or Z/X rotate · Space meter · Esc pause',
    touch: 'Drag to move · Tap to rotate · Drag down to drop · Buttons rotate and pause',
  },
  modes: { ladder: 'LADDER', endless: 'ENDLESS' },
  // Match buttons: the symbol shown while an icon's art is missing, and tints for the placeholder button.
  touchSymbols: { cw: '↻', ccw: '↺', pause: 'II', meter: '★' },
  touchTints: { normal: 0x4c4670, pressed: 0x7d6fc4 },
  // An icon without a button behind it dims while pressed.
  pressedAlpha: 0.6,
};
