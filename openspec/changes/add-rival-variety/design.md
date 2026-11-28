# Design

## Context

See proposal.md, Why, for the measured baseline. Current state after SA-10:

- **Rivals.** `createRival(id, matchSeed)` seeds the bot stream with `seedRng(matchSeed ^ hashId(id))`. `rivalInput` starts a plan job at each spawn with `startPlan(seen(board, opponent), profile)`, draws a rank once per pair and steers there. The planner reads `profile.weights`, `profile.fire`, `profile.meter`, `lookahead` and `beam` only.
- **Rating.** `rateMove` (points, attack, cancel, stainMatch, scaled by `fire`) and `rateShape` (links, height, spawnColumn, gunk, stainSetup) plus `rateChainSetup` from probes. All integer.
- **Pick.** `pick(job, rank)` takes the rank-th first move among non-fatal roots, ordered by depth, then score, then index.
- **What a bot sees.** `seen()` already copies the opponent's grid, stains, pending, meter and score. It doesn't copy `chain`, which is the current chain counter (visible on screen as the chain count, and shown in the HUD from SA-13).
- **Purity.** `src/config/rivals.js` may import nothing. `src/ai/` may import `../config/rivals.js` and `../config/rules.js` only.
- **Sim.** `playMatch` builds both bots from the match seed. The worker records outcome and stats, not placements.
- **Callers of `createRival`.** `MatchScene.begin`, `scripts/simMatch.js` and the tests `tests/ai/rival.test.js` and `tests/match/runner.test.js`.

## Goals / Non-Goals

**Goals:**
- **Data, not code paths.** The persona, the plans and the adaptation are all weight changes applied before the existing search. The planner's search doesn't change, so its cost model and determinism carry over.
- **An exact baseline.** With variety off (`plain`), a rival plays move for move as it did in SA-10. The variety checks compare against that, and a test pins it.
- **Cheap opening checks.** The opening metrics need only the first 8 pairs, so CI can run all 200 bot seeds.

**Non-Goals:**
- **A new search.** No rollouts, no opponent modelling beyond reading its board.
- **Perfect plan detection.** Plan failure uses simple visible signals. It only has to be right often enough to look like adaptation.

## Decisions

### 1. Module layout

| File | Change |
|---|---|
| `src/config/rivals.js` | Each profile gains `vary`, `adapt` and `margin`. A shared `PLANS` table (in the same file, since profiles may not import) holds each plan's overlay |
| `src/ai/persona.js` | New: `drawPersona(profile, rng)` and `pairProfile(profile, persona, plan, reading)`, which returns the weights, `fire` and `margin` to plan this pair with |
| `src/ai/rival.js` | `createRival(id, seed, {plain})`, persona and plan state, the per-tick chain watch, plan failure and switching, validation of the new fields |
| `src/ai/planner.js` | The job reads the boards first (its first units), then searches with the pair's profile. `pick` honors the margin |
| `src/ai/evaluate.js` | `rateShape` gains the `area` and `colorLinks` terms. A `longestChain(grid)` helper yields one unit per probe step, reused for both boards |
| `src/ai/view.js` | `seen()` also copies the own board's `chain` |

### 2. The bot seed

`createRival(id, seed, {plain = false} = {})`. `seed` is the bot seed, still mixed with `hashId(id)`. The game keeps calling `createRival(\`rival${n}\`, matchSeed)`, so the bot seed is the match seed and nothing new is stored. The sim's variety run passes a different seed with the same match seed.

*Alternative:* a separate random bot seed in the game (from `crypto`). That would put a second seed into every run record (SA-12) for no benefit, because the match seed is already fresh each match. Rejected.

### 3. Persona

Drawn once, in `createRival`, before anything else touches the stream, with a fixed number of draws so the stream position after it is fixed. In `plain` mode no persona is drawn, so the stream matches SA-10 exactly.

| Field | Drawn from | Effect |
|---|---|---|
| `plan` | `vary.plans` (`{build, rush, paint}` weights out of 100) | Which `PLANS` overlay applies |
| `risk` | integer in `vary.risk` (e.g. −1…1) | `fire.at` += risk (kept ≥ 1); `height` and `spawnColumn` scaled by `100 − risk × vary.riskPercent` % |
| `patience` | integer in `vary.patience` ticks | `pace.dropDelay` += patience (kept ≥ 0). `actEvery` never varies, because pace drives strength most |
| `colors` | 1 or 2 distinct colors (count from `vary.colors`) | `colorLinks` weight = draw in `vary.colorBonus`, per neighbor pair of a preferred color |
| `area` | left (col 0), center (col 3) or right (col 6) | `area` weight = draw in `vary.areaBonus`, per visible blob × `(3 − |col − center|)` |

`PLANS` overlays are integer percentages on weights plus a `fire.at` shift:

| Plan | Overlay (working values, tuned in task 4) |
|---|---|
| build | `chainSetup` 150%, `attack` 80%, `fire.at` +1 |
| rush | `chainSetup` 50%, `attack` 140%, `cancel` 120%, `fire.at` set to 1 |
| paint | `stainMatch` 170%, `stainSetup` 200%, `chainSetup` 80% |

Signature plans: BUILDER build, RUSHER rush, PAINTER paint. ROOKIE and ACE spread their plan weights more evenly, but each still has a most likely plan (ROOKIE rush, ACE build). `validateRivals` checks that plan weights add up to 100, that every range is `[min, max]` with integers and `min ≤ max`, and that `margin` and every `adapt` value is a non-negative integer.

### 4. Near-tie pick

`pick(job, rank, margin)`. Among non-fatal roots ordered as now, every root whose score is within `margin` of the best (at the best's depth) joins a tie group. The draw:

1. Draw the rank with `pickWeights` as now (one stream draw).
2. If the rank is 0 and the tie group has more than one move, draw one of them uniformly (a second draw). Ranks 1 and up count from the first move after the tie group, so rank 1 is the best move outside the margin.

So the stream advances once or twice per pair, but always the same way for the same state. `margin` 0 gives exactly SA-10's pick. Working margins: ROOKIE 0 (already varied), RUSHER and PAINTER about 1 link's value, BUILDER and ACE about 2 links'. The final numbers come from task 4.

*Alternative:* softmax over scores. It needs fractions or exponent tables, and it lets a poor move through on a flat board. Rejected for the integer margin.

### 5. Reading the boards: the job's first units

`startPlan(seen, profile, persona, state)` builds a job whose generator first does the reading, then the search:

1. **Own setup:** `longestChain(seen.grid)`, one unit per probe step, as chain setup costs now.
2. **Player threat:** `longestChain(seen.opponent.grid)`, the same way.
3. Counts that cost nothing extra: the player's stack height, the player's blobs resting on matching stains, the own blobs on matching stains, the score gap, pending gunk, whether the player's meter is full.
4. **Plan check** (section 7), then `pairProfile(...)` builds this pair's weights.
5. The search, unchanged, with those weights.

Before the reading finishes there's no `best` move, so the bot sends nothing for those ticks. Reading costs at most a few dozen units, so even the ROOKIE (6 units a tick) loses only a few ticks of a pair. The danger Rinse doesn't wait for the job, as now.

`plain` mode skips steps 1–4, so the job's units are identical to SA-10.

### 6. Adaptation

`pairProfile` starts from the profile, applies the persona and plan overlays, then the adaptation, all in integer percent:

| Signal | Reading | Change (scaled by the profile's `adapt.<signal>` %) |
|---|---|---|
| threat | `pressure` = 25 × player's longest chain (cap 4) + 5 × player's stain-resting blobs, cap 100 | `fire.smallPercent` moves toward 100 by `pressure × adapt.threat / 100`; `height` grows by the same %; at pressure ≥ 75, `fire.at` −1 |
| meter | player's meter full and the player has no pending gunk | `attack` −`adapt.meter` %, `chainSetup` +`adapt.meter` % |
| gap | `gap` = player score − own score, compared with `adapt.gapPoints` | behind by more: `fire.at` +1, `chainSetup` +`adapt.gap` %; ahead by more: `fire.at` −1, `height` +`adapt.gap` % |
| gunk | own pending gunk `g` | `cancel` +`min(g, 14) × adapt.gunk / 7` %; at `g` ≥ 7, `fire.at` −1 |

`fire.at` is kept at 1 or more throughout. The ROOKIE's `adapt` values are small, so it stays naive. The ACE adapts most.

*Alternative:* explicit modes (attack, defend, recover) as separate profiles. They jump between behaviors instead of shading them, and need more tuning. Rejected.

### 7. Plan failure and switching

The bot keeps `setup` (own longest chain at the last pair start) and `fired` (the largest `chain` seen on its board since then, read every tick before the phase check). At each pair start, with the new reading:

- **build** fails if `setup − longest ≥ 2` and `fired < setup − 1`, or the tallest column reaches `vary.highStack` rows.
- **paint** fails if no own blob has rested on a matching stain for `vary.dryPairs` pairs in a row.
- **rush** fails only on the high stack.

A failure draws the new plan from the profile's `vary.plans` weights with the current plan left out (one stream draw), and starts `hold` = `vary.hold` pairs during which no failure is checked. Switches are counted on the bot for the sim. Nothing switches the plan back on its own.

### 8. `--variety` in the sim

- **Options.** `--variety` with `--matches` (default `SIM.varietyMatches` 200), `--rivals`, `--seed` (piece seed, default 1) and `--quick`.
- **Jobs.** For each rival `n` and `i` in `0…matches−1`: `{rival: n, botSeed: SIM.varietyBotSeed + i, pieceSeed, plain}` twice (varied and baseline), or once (varied) with `--quick`. The opponent is `rival(n−1)` created `plain` with bot seed `pieceSeed`, or sparring for rival 1. The rival is always on board 1, as in the game.
- **Match.** `playMatch` gains bot options (`botSeed`, `plain`) and `stopAfter` (the rival's lock count), and records the rival's first 8 lock events as placement keys (sorted `col,row,color` cells), its persona plan, plan switches, and both scores.
- **Metrics.** Distinct openings is the size of the set of joined first-8 keys divided by the matches. Overlap is, over all pairs of matches, the count of equal keys at the same index divided by 8, averaged. Both are pure functions in `simCore.js`, with unit tests on made-up key lists.
- **Checks.** As in the spec, from `SIM.variety` (`distinctPercent` 95, `overlapPercent` 50, `winBand` 10, `scoreBandPercent` 15, `spreadRatio` 125). All percentages are compared in floating point, since the sim isn't pure.
- **Workers.** The same round-robin dealing, gathered by rival, mode and bot seed, so the results don't depend on the worker count.
- **CI.** `- run: npm run sim -- --variety --quick` after the quick strength sim.

### 9. Testing approach

- **Baseline pin:** before any change, record a hash of every rival's inputs over one seeded match each against the sparring rival (task 1.1). `plain` mode must reproduce it.
- **Persona:** determinism by seed, ranges respected, every allowed plan appears, signature plan most common, opposite areas place blobs differently (ASCII empty board, 8 pairs).
- **Near-tie:** a board with two equal best moves and a weaker third: across 200 seeds both best moves appear, and the third doesn't appear more than its rank weight allows.
- **Adaptation:** ASCII fixtures for each scenario in the spec, comparing the `pairProfile` result (fire values and weights) and, where it matters, the chosen move.
- **Plan failure:** a build board where gunk lands on a 4-chain setup switches the plan at the next pair; an untouched setup doesn't.
- **Properties with variety on:** budget never exceeded, inputs identical across two runs, `rng`/`gunkRng` blindness, read-only boards.
- **Sim:** the metrics functions, and an in-process `--variety --quick --rivals 1 --matches 6` shape test.
- **Styles:** the existing style test runs with variety on.

## Risks / Trade-offs

- [**Variety may cost the ACE and BUILDER strength, breaking the 60% neighbor checks or the 10-point band**] → The near-tie margin only picks among moves it already rates as almost equal, and persona ranges are narrow for strong rivals. Task 4 tunes margin, ranges and `adapt` against both the variety checks and the neighbor sim before anything else depends on them. If the ACE can't reach 95% distinct openings within the band, the proposal's targets come back to Gilbert rather than being loosened quietly.
- [**A single piece seed may be unusually easy or hard**] → The baseline uses the same pieces, so the band compares like with like. Running `--seed 2` is part of the tuning task as a cross-check.
- [**The full variety run is slow**] → 2,000 matches, and rival 1 and 2 matches run about six minutes of play. It's local only, spread over workers, and `--matches` cuts it down. CI runs only the quick version, which stops after 8 pairs.
- [**Reading the boards delays the ROOKIE's first input each pair**] → A few ticks at most, and the ROOKIE is slow on purpose. The budget test still holds.
- [**e2e tests that rely on a rival's exact moves**] → None are known (`e2e/rivals.spec.js` checks which bot plays). Any that break get new expectations, and the change is noted in the tasks.
- [**Plan failure signals are crude**] → They are visible-only by design. The sim reports switch counts so silly flapping shows up, and `hold` limits it.

## Migration Plan

No engine, rules or replay change. Stored replays and hashes stay. `plain` keeps the SA-10 behavior reachable for the baseline. Rollback means reverting the branch.
