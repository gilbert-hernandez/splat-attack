// `npm run sim` settings. Tooling, not rules: nothing here changes how a match plays.
export const SIM = {
  // A match still running after this many ticks (10 minutes of play) is cut off.
  maxTicks: 36000,
  // Matches per pairing: the full run and `--quick`.
  matches: 100,
  quickMatches: 20,
  firstSeed: 1,
  // Pass checks, as win percentages of all matches in a pairing (draws and cut-offs count as not won).
  // Each rival must win at least neighborPercent against the rival below it, and rival1 more than
  // baselinePercent against the sparring rival. `--quick` checks only more than quickPercent.
  neighborPercent: 60,
  baselinePercent: 50,
  quickPercent: 50,
  maxWorkers: 4,
  // `--variety`: bot seeds per rival (firstBotSeed, firstBotSeed + 1, ...) on one piece seed, and the
  // checks. distinctPercent and overlapPercent are the opening targets (the quick run checks only
  // those); winBand is in percentage points from the plain baseline; scoreBandPercent bounds the
  // opponent's points per minute of play, and spreadPercent the standard deviation of its score, as
  // percentages of the plain baseline's.
  variety: {
    matches: 200,
    firstBotSeed: 1000,
    distinctPercent: 95,
    overlapPercent: 50,
    winBand: 10,
    scoreBandPercent: 15,
    spreadPercent: 125,
  },
};
