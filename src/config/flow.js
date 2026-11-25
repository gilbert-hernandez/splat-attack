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
  // Result keys are ignored this long, so keys mashed at the end don't skip it.
  resultInputDelayMs: 500,
  hint: 'A/D or ←/→ move · S or ↓ drop · Q/E or Z/X rotate · Space meter · Esc pause',
  modes: { ladder: 'LADDER', endless: 'ENDLESS' },
};
