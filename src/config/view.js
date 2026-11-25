// Board drawing tunables. Times are in ticks. None of these affect results.
export const VIEW = {
  // How long moves, rotations and kicks take to draw. 0 draws them at once.
  easeTicks: 4,
  idleFrameTicks: 12,
  landFrameTicks: 3,
  ghostAlpha: 0.35,
  // Next-pair boxes, from the board frame's right edge.
  next: { gap: 8, spacing: 104, boxWidth: 64, boxHeight: 96 },
};
