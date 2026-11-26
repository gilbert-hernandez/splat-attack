# Tasks

## 1. Profiles, snapshot and simulation

- [ ] 1.1 Add `src/config/rivals.js` with five profiles (design table) and `validateRivals()`. Allow `../config/rivals.js` for `src/ai/` in `eslint.config.js` and apply the pure-config rules to it. Verify with tests:
  - lookahead over `RULES.nextPairs + 1` throws naming the rival
  - mismatched `pickWeights` throws
  - the purity test rejects `0.5` and an import in `src/config/rivals.js`
- [ ] 1.2 Add `src/ai/view.js` (`seen(board, opponent)`). Verify with tests:
  - the snapshot has no `rng`/`gunkRng` and only the first `RULES.nextPairs` queue entries
  - changing the snapshot doesn't touch either board
- [ ] 1.3 Add `simulate()` in `src/ai/evaluate.js`: placement, gravity, splats with `applyStains`, `splatPoints`, `splatPower` and `hitGunk`, top-out, and the Bomb through `explode()` on a copy. Verify with ASCII fixture tests:
  - a two-step chain gives the same points and power as the engine
  - a stain match is counted
  - gunk is cracked and cleared
  - blocked and off-board placements are rejected
  - a Bomb gives the same grid and stains as the engine's
- [ ] 1.4 Add the reachability check and `rate()` (every weight in design §5, `chainSetup` probes with their unit cost). Verify with fixture tests:
  - a placement behind a column taller than the pair's row is unreachable
  - top-out rates worst
  - holes and spawn-column height rate lower
  - a board one blob from a three-chain gets a higher `chainSetup` than a flat board

## 2. Planner and rival bot

- [ ] 2.1 Add the incremental beam-search job in `src/ai/planner.js` (`startPlan`, `stepPlan(job, units)`, `best`, deterministic tie-breaks). Verify with tests:
  - no `stepPlan` call spends more than its units
  - `best` exists after the first unit
  - the result doesn't depend on how the units were split across calls (1 per call vs. all at once)
  - the lookahead-2 setup fixture is found at lookahead 2 and missed at lookahead 1
- [ ] 2.2 Add the meter moves (`rinse`, `bomb@c`) with the `rinseAt` floor and `bombBias`. Verify with fixture tests:
  - pending gunk that would reach the spawn row makes the bot Rinse
  - the PAINTER Bombs a column of mixed blobs over its stain color
  - with the meter not full, no meter move is offered
- [ ] 2.3 Add `src/ai/rival.js` (`createRival(id, matchSeed)`, `rivalInput(bot, board, opponent)`): a plan per spawn, the work budget per tick, rank drawing with `pickWeights`, steering with pacing, the Bomb aimed before firing, and the best move so far when grounded. Verify with tests:
  - pace gaps are at least `actEvery`, and the drop waits `dropDelay`
  - the Bomb's target equals the planned column
  - work units per tick never go over budget across seeded whole matches against sparring, for all five rivals
  - inputs are identical across two runs
  - inputs are identical when only `rng`/`gunkRng` and pairs past the preview differ
  - the boards are unchanged after `rivalInput`
  - two rivals on the same seed give different inputs
  - the purity lint passes

## 3. Simulator

- [ ] 3.1 Add `scripts/simConfig.js`, `scripts/sim.js` (options, pairings, side alternation, seed list, report table, pass checks, exit code) and `scripts/simWorker.js` (`node:worker_threads`, per-bot timing, units and the match record). Add the `sim` script to `package.json`. Verify:
  - an in-process test of `--quick --rivals 1,2 --matches 4` checks the report fields and the skipped checks
  - a test shows `--workers 1` and `--workers 4` give identical reports apart from timings
  - a test shows a match hitting `maxTicks` counts as cut off
- [ ] 3.2 Add the quick sim step to `.github/workflows/ci.yml` after `npm run check`. Verify that `npm run sim -- --quick` finishes in under two minutes locally with 4 workers, and record the time in the PR notes

## 4. Tuning

- [ ] 4.1 Run `npm run sim` and tune profiles (pace, lookahead, beam, budget, pick weights, weights) until every pass check holds and the strongest rival's worst tick is under 1 ms. Verify by keeping the final report in the PR notes, with each pairing's win rate, worst units and worst ms
- [ ] 4.2 Add the distinct-styles test: each rival plays 20 seeded matches against sparring. The RUSHER sends more, smaller attacks than the BUILDER, the BUILDER's average longest chain beats the RUSHER's, and the PAINTER's stain matches per splat beat the ROOKIE's. Verify that `npm test` passes, and retune 4.1 if it doesn't

## 5. Game wiring

- [ ] 5.1 Change `MatchRunner` to call `readRivalInput(rival, player)` and update its JSDoc. Verify that the runner and sparring tests pass unchanged, and add a runner test where the input source receives both boards before the tick
- [ ] 5.2 Wire the climb: ModeSelect sends `rival: 1`, MatchScene builds `createRival` from `data.rival` (clamped) and the match seed, the stats carry the rival, and Result shows `FLOW.rivalLabel` and sends `next` on play again (win → next with wrap, loss or draw → same). Verify with unit tests of the next-rival function and e2e tests (forced win against rival 2 → play again → rival 3; win against 5 → rival 1; forced end → same rival; title → Ladder → rival 1)
- [ ] 5.3 Add `match.ladder.rivalLabel` places to every layout and the label text in MatchScene. Verify with the layout overlap tests at every portrait height and both landscape modes using the longest label, then regenerate the landscape fixture with `UPDATE_LANDSCAPE=1 npx playwright test landscape` and review the diff
- [ ] 5.4 Add the `KeyV` next-rival debug key (a new seed, the label updated, does nothing in Endless) and `V rival` in `DEBUG.hint`. Verify with an `e2e/debug.spec.js` case (rival 5 → V → rival 1 with a new seed) and the Endless no-op
- [ ] 5.5 Update `README.md` (rivals and styles, fairness rules, work budget, Ladder climb, debug key, `npm run sim` options, report and checks, sparring as baseline) and the MatchScene header comment. Verify each statement against the code

## 6. Checks and manual verification

- [ ] 6.1 Run `openspec validate add-cpu-rivals --strict`, `npm run check`, `npm run sim -- --quick` and `npm run e2e -- --workers=4`. All pass
- [ ] 6.2 Manual check: run `npm run dev` (and `-- --host` for the Android phone) and play Ladder in landscape keyboard, landscape touch and portrait touch. Confirm:
  - The label shows RIVAL 1 · ROOKIE, and the Rookie is slow and beatable
  - Winning moves to rival 2, and losing repeats the rival
  - V steps through all five, and each one plays visibly differently: the Rusher attacks fast, the Painter splats on its stains and Bombs to paint, the Builder holds for big chains, and the Ace is fast and sharp
  - Rivals Rinse and Bomb on their own, and a Bomb lands where the pair was
  - No stutter on the phone against the Ace, even during gunk exchanges
  - The result names the rival
  - Endless is unchanged

## 7. Finish

- [ ] 7.1 Bump to 0.1.8 and add the CHANGELOG.md section for SA-10 (five rivals, the Ladder climb, `npm run sim`, the CI step, unchanged replays and hashes). Verify `npm test` passes
