// The CPU rivals' profiles (src/ai/rival.js). Like rules.js, this is pure data with integers only, and
// it affects results. Percentages are whole numbers out of 100.
//
// - pace: at most one move, rotation or meter fire per actEvery ticks; dropDelay ticks in place
//   before soft-dropping.
// - lookahead: pairs planned with, the falling pair included (at most RULES.nextPairs + 1).
// - beam: plans kept at each depth. budget: work units per tick (about one simulated placement each).
// - pickWeights: the chance, by rank, of playing each of the best few first moves.
// - fire: chains shorter than `at` steps are worth only smallPercent of their value, so the rival
//   keeps building toward a bigger one.
// - weights: what a board is worth. Signed; see src/ai/evaluate.js for each term.
// - meter: always Rinse once rinseAt gunk is pending; rinseBias and bombBias are added to the value of
//   every Rinse and Bomb move.
//
// Variety (SA-11; src/ai/persona.js). None of it applies to a `plain` rival, which plays as in SA-10.
// - margin: first moves rated within this many points of the best count as equally good, and the
//   rival draws one of them, while its board is open (at most vary.openCells blobs and gunk).
// - vary: the ranges each match's persona is drawn from, [min, max] inclusive.
//   - plans: the chance, out of 100, of starting with each plan in PLANS. The most likely is the
//     rival's signature plan.
//   - risk: added to fire.at; height and spawnColumn shrink by riskPercent per step of risk.
//   - patience: ticks added to pace.dropDelay.
//   - colors: how many preferred colors; colorBonus: per same-color link of a preferred color.
//   - areaBonus: for a first move only, per cell of the pair landing in the lower half of the board,
//     times its closeness (0 to 3) to the preferred side.
//   - highStack: a build or rush plan fails at this column height; dryPairs: a paint plan fails
//     after this many pairs with no blob on a matching stain; hold: pairs a new plan is kept.
//   - openCells: the margin applies while the board holds at most this many cells.
// - adapt: how strongly it reacts, in percent, to the player's threat, the player's full meter, the
//   score gap (beyond gapPoints) and its own pending gunk.
export const RIVALS = [
  {
    id: 'rival1',
    number: 1,
    style: 'ROOKIE',
    pace: { actEvery: 10, dropDelay: 40 },
    lookahead: 1,
    beam: 1,
    budget: 6,
    pickWeights: [55, 25, 12, 8],
    fire: { at: 1, smallPercent: 100 },
    weights: {
      points: 1,
      attack: 20,
      cancel: 10,
      chainSetup: 0,
      stainMatch: 0,
      stainSetup: 0,
      links: 12,
      height: -2,
      spawnColumn: -6,
      gunk: -4,
    },
    meter: { rinseAt: 18, rinseBias: -200, bombBias: -400 },
    margin: 0,
    vary: {
      plans: { build: 10, rush: 60, paint: 30 },
      risk: [-1, 1],
      riskPercent: 15,
      patience: [-10, 10],
      colors: [1, 2],
      colorBonus: [2, 6],
      areaBonus: [2, 4],
      highStack: 10,
      dryPairs: 8,
      hold: 6,
      openCells: 24,
    },
    adapt: { threat: 10, meter: 10, gap: 10, gapPoints: 3000, gunk: 10 },
  },
  {
    id: 'rival2',
    number: 2,
    style: 'RUSHER',
    pace: { actEvery: 5, dropDelay: 10 },
    lookahead: 2,
    beam: 4,
    budget: 12,
    pickWeights: [70, 20, 10],
    fire: { at: 1, smallPercent: 100 },
    weights: {
      points: 1,
      attack: 120,
      cancel: 60,
      chainSetup: 4,
      stainMatch: 4,
      stainSetup: 0,
      links: 16,
      height: -3,
      spawnColumn: -10,
      gunk: -8,
    },
    meter: { rinseAt: 10, rinseBias: 0, bombBias: 60 },
    margin: 8,
    vary: {
      plans: { build: 15, rush: 65, paint: 20 },
      risk: [-1, 1],
      riskPercent: 15,
      patience: [-4, 4],
      colors: [1, 2],
      colorBonus: [2, 8],
      areaBonus: [2, 6],
      highStack: 10,
      dryPairs: 8,
      hold: 6,
      openCells: 24,
    },
    adapt: { threat: 20, meter: 15, gap: 15, gapPoints: 3000, gunk: 20 },
  },
  {
    id: 'rival3',
    number: 3,
    style: 'PAINTER',
    pace: { actEvery: 5, dropDelay: 16 },
    lookahead: 2,
    beam: 6,
    budget: 16,
    pickWeights: [75, 18, 7],
    fire: { at: 4, smallPercent: 35 },
    weights: {
      points: 1,
      attack: 50,
      cancel: 25,
      chainSetup: 25,
      stainMatch: 60,
      stainSetup: 12,
      links: 18,
      height: -3,
      spawnColumn: -10,
      gunk: -8,
    },
    meter: { rinseAt: 10, rinseBias: 0, bombBias: 80 },
    margin: 9,
    vary: {
      plans: { build: 20, rush: 15, paint: 65 },
      risk: [-1, 1],
      riskPercent: 15,
      patience: [-6, 6],
      colors: [1, 2],
      colorBonus: [2, 8],
      areaBonus: [2, 6],
      highStack: 10,
      dryPairs: 8,
      hold: 6,
      openCells: 24,
    },
    adapt: { threat: 0, meter: 15, gap: 0, gapPoints: 3000, gunk: 20 },
  },
  {
    id: 'rival4',
    number: 4,
    style: 'BUILDER',
    pace: { actEvery: 6, dropDelay: 24 },
    lookahead: 3,
    beam: 6,
    budget: 64,
    pickWeights: [85, 15],
    fire: { at: 6, smallPercent: 20 },
    weights: {
      points: 1,
      attack: 30,
      cancel: 20,
      chainSetup: 40,
      stainMatch: 8,
      stainSetup: 2,
      links: 20,
      height: -2,
      spawnColumn: -12,
      gunk: -8,
    },
    meter: { rinseAt: 8, rinseBias: 100, bombBias: -80 },
    margin: 20,
    vary: {
      plans: { build: 65, rush: 15, paint: 20 },
      risk: [-1, 1],
      riskPercent: 10,
      patience: [-6, 6],
      colors: [1, 2],
      colorBonus: [2, 8],
      areaBonus: [2, 6],
      highStack: 10,
      dryPairs: 8,
      hold: 6,
      openCells: 24,
    },
    adapt: { threat: 0, meter: 20, gap: 20, gapPoints: 3000, gunk: 25 },
  },
  {
    id: 'rival5',
    number: 5,
    style: 'ACE',
    pace: { actEvery: 3, dropDelay: 4 },
    lookahead: 3,
    beam: 8,
    budget: 80,
    pickWeights: [92, 8],
    fire: { at: 4, smallPercent: 40 },
    weights: {
      points: 1,
      attack: 70,
      cancel: 40,
      chainSetup: 25,
      stainMatch: 20,
      stainSetup: 4,
      links: 20,
      height: -3,
      spawnColumn: -12,
      gunk: -10,
    },
    meter: { rinseAt: 8, rinseBias: 40, bombBias: 0 },
    margin: 20,
    vary: {
      plans: { build: 45, rush: 30, paint: 25 },
      risk: [-1, 1],
      riskPercent: 10,
      patience: [-2, 2],
      colors: [1, 2],
      colorBonus: [2, 8],
      areaBonus: [2, 6],
      highStack: 10,
      dryPairs: 8,
      hold: 6,
      openCells: 24,
    },
    adapt: { threat: 30, meter: 25, gap: 25, gapPoints: 3000, gunk: 30 },
  },
];

// Each plan's overlay on a rival's weights: percentages of the profile's weights, and a change to
// fire.at (fireShift is added; fireSet, when not 0, replaces it). Applied before the persona's risk,
// and only when the plan isn't the rival's signature plan (its most likely one), which its profile
// is already tuned for.
export const PLANS = {
  build: { weights: { chainSetup: 120, attack: 95 }, fireShift: 1, fireSet: 0 },
  rush: { weights: { chainSetup: 80, attack: 120, cancel: 110 }, fireShift: -1, fireSet: 0 },
  paint: { weights: { stainMatch: 140, stainSetup: 140, chainSetup: 95 }, fireShift: 0, fireSet: 0 },
};
