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
  fallSpeed: 8,
  softDropSpeed: 128,
  // Each pair's lock budget: one spent per grounded tick, more per floor kick, never refilled.
  lockBudget: 30,
  floorKickCost: 8,
  settleTicks: 12,
};
