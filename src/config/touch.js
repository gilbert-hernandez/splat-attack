// Touch gestures. Distances in CSS pixels unless noted, so they are the same size on any screen.
// Times are in ticks.
export const TOUCH = {
  // Travel that turns a press into a drag.
  dragStart: 10,
  // A drag drops only if it goes down at least this many times as far as sideways.
  dropBias: 1.5,
  // Finger travel per column, in game pixels (a board column), but at least this on screen.
  columnStep: 32,
  minColumnStep: 24,
  // How much of a step the first column takes.
  firstStep: 0.5,
  // Most moves waiting; the board is this many moves wide.
  maxQueue: 6,
  // Longest press that is still a tap.
  tapTicks: 18,
};
