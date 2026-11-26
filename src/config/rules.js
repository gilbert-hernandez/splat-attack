// Rules tunables: anything here affects results, so the engine imports only this file. Pure data,
// integers only. Times are in ticks (60 per second of play).
export const RULES = {
  columns: 7,
  visibleRows: 12,
  hiddenRows: 2,
  colors: 5,
  nextPairs: 2,
  // Fall progress is counted in 1/256 of a row. Speeds must not exceed rowUnits.
  rowUnits: 256,
  // Fall speed at level 1, added per level, and the most it can be (at most softDropSpeed).
  fallSpeed: 8,
  fallSpeedPerLevel: 4,
  maxFallSpeed: 128,
  pairsPerLevel: 10,
  softDropSpeed: 128,
  // Each pair's lock budget: one spent per grounded tick, more per floor kick, never refilled.
  lockBudget: 30,
  floorKickCost: 8,
  settleTicks: 12,
  // How long a splat holds before blobs fall.
  splatTicks: 24,
  groupSize: 4,
  scoring: {
    blobPoints: 20,
    // Per blob past groupSize.
    extraBlobPoints: 15,
    // Added for each color past the first in one chain step.
    colorPercent: 50,
    // Chain step k multiplies by chainPercent * k + chainGrowth * k * (k - 1) percent.
    chainPercent: 100,
    chainGrowth: 25,
    // Per blob that splats on a stain of its own color, added before the color and chain bonuses.
    stainPoints: 10,
  },
};
