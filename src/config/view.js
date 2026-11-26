// Board drawing tunables. Times are in ticks. None of these affect results.
export const VIEW = {
  // How long moves, rotations and kicks take to draw. 0 draws them at once.
  easeTicks: 4,
  idleFrameTicks: 12,
  landFrameTicks: 3,
  ghostAlpha: 0.35,
  // Stains are drawn under everything at this alpha, on top of their art's own low contrast.
  stainAlpha: 0.5,
  nextBox: { width: 64, height: 96 },
  // Pending gunk: at most this many icons, each as tall as its strip, this far apart.
  pendingIcons: 6,
  pendingIconGap: 4,
};
