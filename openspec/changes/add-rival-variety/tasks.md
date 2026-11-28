# Tasks

## 1. Baseline, bot seed and plain mode

- [x] 1.1 Before changing any bot code, add a test that records a hash of every tick's input for each of the five rivals over one seeded match against the sparring rival (seed 7, whole match), with the hashes stored in the test. Verify that it passes on the unchanged SA-10 code
- [x] 1.2 Change `createRival(id, seed, {plain})` so `seed` is the bot seed, add `plain`, and update every caller (`MatchScene`, `scripts/simMatch.js`, the rival and runner tests). Copy the board's `chain` into `seen()`. Verify with tests:
  - the 1.1 hashes still match with `plain: true`
  - the same match seed with two bot seeds gives the same pieces and different rival inputs
  - the hidden-information test still passes

## 2. Persona, plans and the near-tie pick

- [x] 2.1 Add `vary`, `adapt` and `margin` to each profile and the shared `PLANS` table in `src/config/rivals.js` (working values from design §3, §4 and §6). Extend `validateRivals`. Verify with tests:
  - plan weights that don't add up to 100 throw naming the rival
  - a range with `min > max` or a non-integer throws
  - a negative `margin` or `adapt` value throws
  - the purity lint still passes on `src/config/rivals.js`
- [x] 2.2 Add `src/ai/persona.js` (`drawPersona`) and draw the persona in `createRival` unless `plain`. Verify with tests:
  - the same seed gives the same persona
  - over 200 seeds every value stays in range, every allowed plan appears, and more than one area and color appear
  - each signature plan is the most common for its rival
  - `plain` draws nothing (the 1.1 hashes hold)
- [x] 2.3 Add the `area` and `colorLinks` terms to `rateShape`, and `pairProfile` applying the persona and plan overlays. Verify with tests:
  - a blob nearer the preferred side rates higher
  - a link of a preferred color rates higher than another color's
  - each plan overlay changes the weights as design §3 lists
  - on an empty board, rivals with left and right areas place more blobs on their own side over 8 pairs
- [x] 2.4 Add the near-tie margin to `pick`, with its second draw only for a tie group at rank 0. Verify with tests:
  - with margin 0 the pick is unchanged (1.1 hashes in `plain`)
  - on a board with two equal best moves, both appear across 200 seeds
  - a move outside the margin is picked no more often than its rank weight allows (within a 5-point tolerance over 1,000 seeds)

## 3. Adaptation and plan switching

- [x] 3.1 Move the reading into the job (design §5): own and player `longestChain` with one unit per probe step, then the free counts. Verify with tests:
  - no tick spends more than the budget across seeded whole matches for all five rivals with variety on
  - the job's results don't depend on how units are split across calls
  - in `plain` the job's unit counts equal SA-10's
- [x] 3.2 Add the adaptation in `pairProfile` (design §6). Verify with ASCII fixture tests, one per spec scenario:
  - a player chain of 4 raises the value of firing a smaller chain
  - a full player meter with no pending gunk lowers `attack` and raises `chainSetup`
  - being far behind raises `fire.at`
  - heavy pending gunk raises `cancel` and lowers `fire.at`
  - `fire.at` never drops below 1
- [x] 3.3 Add plan failure and switching (design §7): the per-tick chain watch, the build, paint and rush failures, the weighted switch draw and `hold`. Verify with tests:
  - a build setup of 4 buried by gunk to 2 or less switches the plan at the next pair
  - an intact setup, or one fired as a chain, doesn't switch
  - a paint plan with no stain-resting blobs for `dryPairs` pairs switches
  - no failure is checked during `hold`
  - inputs are identical across two runs with variety on, and both boards are unchanged by `rivalInput`

## 4. Variety run and tuning

- [x] 4.1 Add `--variety` to the sim (design §8): jobs, the bot options and `stopAfter` in `playMatch`, the first-8 placement keys, the plan and switch counts, the distinct-opening and overlap functions, the report, the checks, `--quick` and `SIM.variety` settings. Verify with tests:
  - the metric functions on made-up key lists (all equal, all different, half overlapping)
  - an in-process `--variety --quick --rivals 1 --matches 6` run has every report field and only the two opening checks
  - `--workers 1` and `--workers 4` give identical variety reports
  - the opponent and pieces are the same across a rival's matches
- [x] 4.2 Tune margins, persona ranges, plan weights and `adapt` until `npm run sim -- --variety` passes every check and `npm run sim` still passes its neighbor checks. Cross-check with `--variety --seed 2`. If the ACE or BUILDER can't reach the opening targets inside the strength band, stop and bring it to Gilbert instead of loosening a target. Verify by keeping both final reports (with runtimes) in the PR notes and the final values in design §3, §4 and §6
  Final reports (`npm run sim -- --variety`, 2,000 matches, 937 s on 4 workers; `npm run sim`, 500 matches, 353 s):
  | Rival | Distinct | Overlap | Won / plain | Opp. points/min vs plain | Opp. sd vs plain |
  |---|---|---|---|---|---|
  | ROOKIE | 98.5% | 4.7% | 85.0% / 85.5% | +0.6% | 93% |
  | RUSHER | 100% | 2.3% | 87.0% / 87.5% | −1.6% | 97% |
  | PAINTER | 100% | 2.0% | 77.5% / 83.5% | +0.8% | 104% |
  | BUILDER | 96.0% | 4.6% | 64.5% / 65.5% | +2.1% | 107% |
  | ACE | 99.0% | 3.8% | 86.5% / 93.0% | +13.7% | 105% |

  Neighbor checks with variety on: rival1 vs sparring 76%, rival2 vs rival1 76%, rival3 vs rival2 78%, rival4 vs rival3 71%, rival5 vs rival4 86%. All pass.
  Cross-check `--variety --seed 2` (1,507 s): every check passes except the ROOKIE's strength band, where it is stronger with variety (76.5% against 64.0% plain). Removing any single variety feature still leaves it at 71–79% on that seed, so it isn't one feature; flagged to Gilbert, not tuned away. The player-score band changed from the average total to points per minute with Gilbert's OK (2026-11-27).
- [x] 4.3 Run the distinct-styles test with variety on (it already uses the game's rivals). Verify that `npm test` passes, and retune 4.2 if it doesn't
- [x] 4.4 Add `- run: npm run sim -- --variety --quick` to `.github/workflows/ci.yml` after the quick sim. Verify that it finishes in under two minutes locally with 4 workers, and note the time in the PR notes (38 s locally for 1,000 opening-only matches)

## 5. Docs

- [x] 5.1 Update `README.md` (persona, plans, near-tie pick, adaptation, plan switching, bot seed, `plain`, the `--variety` options, report and checks, the CI step) and the header comments of `src/ai/rival.js` and `src/config/rivals.js`. Verify each statement against the code

## 6. Checks and manual verification

- [x] 6.1 Run `openspec validate add-rival-variety --strict`, `npm run check`, `npm run sim -- --quick`, `npm run sim -- --variety --quick` and `npx playwright test --workers=4`. All pass; any e2e expectation that relied on a rival's exact moves is updated and named in the PR notes
- [x] 6.2 Manual check: run `npm run dev` (and `-- --host` for the Android phone) and play Ladder in landscape keyboard and portrait touch. Replay the same rival several times (R to end the match, then play again; each match gets a fresh seed) and use V to reach each rival. Confirm:
  - The same rival opens differently from match to match, and on different sides of the board
  - Each rival still plays in its style (the Rusher fast attacks, the Painter stains, the Builder big chains)
  - Building a big chain of your own makes the Ace fire earlier; filling your meter makes it hold back attacks
  - Dropping gunk on a rival's half-built chain (G/H debug keys) makes it change course instead of stacking on
  - `window.__GAME__` shows the rival's persona and current plan
  - No stutter on the phone against the Ace
  - Checked by Gilbert in the browser 2026-11-28: rivals open differently from match to match and keep their styles; everything works as expected
  - Endless is unchanged

## 7. Finish

- [x] 7.1 Bump to 0.1.9 and add the CHANGELOG.md section for SA-11 (persona per match, near-tie pick, adaptation, plan switching, bot seed, `npm run sim -- --variety`, the CI step, unchanged replays and hashes). Verify `npm test` passes
