# Design

## Context

See proposal.md, Why. Current state:

- **The sparring rival.** `src/ai/sparring.js` holds it: one-ply `planPair()`, `greedyInput()` steering, meter thresholds and a pace. It keeps a small state object outside the match. It ignores stains, gunk hits, attack and the preview.
- **The engine.** `src/core/engine.js` and `versus.js` are pure, all integers, with a 7-bit input mask. Each board's `queue` holds `RULES.nextPairs` (2) preview pairs, and both are shown to the player. Board state also carries `rng` (the piece stream) and `gunkRng`, which a fair bot must not read.
- **The runner.** `MatchRunner` calls `readRivalInput(this.rival)` once per tick, before `stepVersus`.
- **The scenes.** `MatchScene.begin()` builds `createSparring()` for Ladder and seeds the match with `crypto.getRandomValues`. Scene data carries only `{mode}` from ModeSelect to Match to Result and back.
- **Purity lint.** It lets `src/core/` and `src/ai/` import only `./x.js`, `../core|ai/x.js` and `../config/rules.js`. `tests/core/purity.test.js` checks the rules.
- **Replays.** They store inputs only, so verifying a match never runs a bot. The stored `versus.json` was generated with sparring bots.
- **Free names.** `KeyV` is free in `DEBUG.keys`. The manifest already has `rival1` to `rival5` in `CHARACTERS`.

## Goals / Non-Goals

**Goals:**
- **One planner.** All five rivals use one planner, and only data (profiles) separates them. SA-11 can then vary a profile per match and adapt it during the match without new search code.
- **A deterministic cost.** Cost per tick is counted in work units, not time, so tests can assert it.
- **Fair input.** A bot sees only a filtered copy of what is visible, so it can't read hidden state by accident.

**Non-Goals:**
- **Strong play.** The bots must be good enough to show distinct styles and a clear strength order, not optimal.
- **Search inside the engine.** The engine doesn't change. The planner uses its exported helpers.

## Decisions

### 1. Module layout

| File | Role |
|---|---|
| `src/config/rivals.js` | `RIVALS`: five profiles, pure data (`validateRivals()` lives in `src/ai/rival.js` and runs at its import) |
| `src/ai/view.js` | `seen(board, opponent)`: the visible snapshot a bot plans from |
| `src/ai/evaluate.js` | `simulate(snapshot, placement)` and `rate(result, weights)` |
| `src/ai/planner.js` | The incremental beam search, as a resumable job |
| `src/ai/rival.js` | `createRival(id, matchSeed)` and `rivalInput(bot, board, opponent)`: pacing, steering and meter firing |

`sparring.js` stays as it is. The sim uses it as a baseline, and the replay generator still uses it.

*Alternative:* fold the sparring bot into rival1. That would make rival1's tuning change the stored-replay generator and the sim's yardstick. Rejected.

### 2. Profiles are pure config

`src/config/rivals.js` follows the purity rules (integers only, no imports). The lint pattern adds `../config/rivals.js` for `src/ai/`, and the pure-config block covers both config files. Weights are integers, and percentages are written as whole numbers out of 100.

Profile shape:

```js
{
  id: 'rival3', number: 3, style: 'PAINTER',
  pace: { actEvery, dropDelay },
  lookahead,       // 1..RULES.nextPairs + 1 (the falling pair counts as 1)
  beam,            // states kept per depth
  budget,          // work units per tick
  pickWeights,     // e.g. [70, 20, 10]: chance per rank, out of 100; its length is how many ranks
  fire: { at, smallPercent },  // chains shorter than `at` are worth smallPercent of their value
  weights: { points, attack, cancel, chainSetup, stainMatch, stainSetup, links, height, spawnColumn, gunk },
  meter: { rinseAt, rinseBias, bombBias },
}
```

`validateRivals()` runs at import. It throws, naming the rival, if `lookahead` exceeds `RULES.nextPairs + 1`, if `pickWeights` don't add up to 100, if a weight isn't an integer or `chainSetup` is negative, if `fire` is out of range, or if a value isn't a positive integer where one is required.

Final styles, after tuning against the sim in task 4:

| Rival | Style | Pace (act/drop) | Look | Beam | Budget | Pick | Character |
|---|---|---|---|---|---|---|---|
| 1 | ROOKIE | 10/40 | 1 | 1 | 6 | 55/25/12/8 | No chain setup, avoids the meter, Rinses late (`rinseAt` 18) |
| 2 | RUSHER | 5/10 | 2 | 4 | 12 | 70/20/10 | High `attack`, fires any chain, Bombs often |
| 3 | PAINTER | 5/16 | 2 | 6 | 16 | 75/18/7 | High `stainMatch` and `stainSetup`, holds for 4-chains, Bombs to paint |
| 4 | BUILDER | 6/24 | 3 | 6 | 64 | 85/15 | High `chainSetup`, holds for 6-chains, Rinses to protect them |
| 5 | ACE | 3/4 | 3 | 8 | 80 | 92/8 | Balanced, fast, holds for 4-chains |

The names are working labels for the placeholder text. David's character names can replace them in SA-14 without changing any id.

### 3. What a bot sees: a snapshot, not the state

`seen(board, opponent)` copies only the visible fields into a new object:

- **Own board:** `grid`, `stains`, `pair`, the first `RULES.nextPairs` entries of `queue`, `pending`, `meter`, `meterLock`, `armed`, `phase`, `pairs` and `score`
- **Opponent:** `grid`, `stains`, `pending`, `meter` and `score`
- **Match:** `tick`

`rng` and `gunkRng` are never copied. The planner and evaluator take only snapshots, so the type-check and the tests keep hidden fields out. A test runs two states that differ only in `rng` and `gunkRng` and checks that their inputs are identical.

The planner never simulates gunk drops, because the columns they land in come from `gunkRng`. It rates pending gunk as a height penalty instead: pending ÷ 7 rows spread evenly. This is a deliberate cost of fairness.

### 4. Simulating a placement with engine helpers

`simulate(snapshot, {col, orientation})` builds on copies of the grid and stains:

1. Place the pair in the top rows, as sparring does. Reject it if the cells are blocked or off the board.
2. `applyGravity`, then loop `findGroups`. For each step, run `applyStains` on the stain copy, then `splatPoints`, `splatPower`, `hitGunk`, clearing, and `applyGravity`.
3. Return `{grid, stains, points, power, chain, stainMatches, gunkCleared}`, plus `toppedOut` when the spawn cell is filled.

The Bomb runs the engine's own `explode()` on a copy of the snapshot's grid, stains and pair. No new rules code exists in `src/ai/`. If the engine changes, the planner follows.

*Reachability.* A placement counts only if the pair can reach it from where it is. `steer()` turns a copy of the pair the short way, then moves it a column at a time with the engine's `rotatePair` and `movePair`, as the bot will. Placements that put the same colors on the same cells count once. Finding a pair's placements costs one work unit.

### 5. Rating

Two weighted integer sums. `rateMove` values what a placement did right away:

- **`points`:** chain points
- **`attack`:** per gunk sent after cancelling own pending gunk; **`cancel`:** per pending gunk cancelled
- **`stainMatch`:** per blob that splatted on its own stain
- **`fire`:** a chain shorter than `fire.at` steps is worth only `fire.smallPercent` of the above, so builders hold for bigger chains

`rateShape` values the board left behind:

- **`links`:** per pair of same-color neighbors
- **`height`:** per filled cell, and per pending gunk
- **`spawnColumn`:** per square of the spawn column's height; a topped-out board is FATAL
- **`gunk`:** per gunk on the board
- **`stainSetup`:** per blob resting on its own color's stain
- **`chainSetup`:** `chainSetup × longest²`, where `longest` is the longest chain one more blob could set off. Probes go on each column top with a free visible cell, one per color touching it, kept only if they would complete a group, and deduplicated by the group they join. Each probe step costs one work unit, and it runs on every node, so building toward a chain counts at every depth.

A node's score is the sum of its moves' `rateMove` values plus `rateShape` of its board.

*Alternative:* learned weights or Monte Carlo rollouts. Rollouts need hidden pieces (unfair) or random guesses (high cost). Rejected for the demo.

### 6. Incremental beam search under a work budget

A plan is a generator-driven job. `stepPlan(job, units)` resumes it until it has spent its units: one per simulated placement, plus one per chain step past the first, one per placement search, and one per chain-setup probe step. So the work per tick is capped exactly and doesn't depend on how the units were split. The job keeps:

- `best`, the best first move found so far, updated after each depth-1 placement so that a fallback always exists after the first unit
- `frontier`, the top `beam` nodes at each depth, sorted by score and tie-broken by column and then orientation for determinism

The job starts when a pair spawns, from a snapshot taken then. The bot can't spend units during settle or splat phases, because the board it would plan for isn't known yet. When the job finishes, the bot picks a move:

1. Rank the first moves by the deepest depth reached, then the best score reachable from each, then their order.
2. Draw a rank with `pickWeights` from the bot's stream, skipping fatal moves.

The rank is drawn once per pair, so the cost and the choice don't depend on how many ticks planning took.

Steering: the danger Rinse first, then the move's meter use (Rinse, or move to the Bomb column then Bomb), then turn, move and soft-drop, all under the rival's pace. While the job still runs, the bot heads for `best` but doesn't soft-drop or fire the meter (except the danger Rinse), so a slow plan doesn't strand the pair. If the pair is grounded (`pair.budget < RULES.lockBudget`) while the job still runs, the job stops, and `best` is final.

Budgets: the unit cap is the guarantee. Tick times on the development machine (WSL) are dominated by preemption: the sparring rival's own worst tick is about 27 ms, so the worst and p99.9 times are noise. The ACE at 80 units runs about 0.4 ms median and about 3 ms p99 per tick there. The sim reports p99.9 and worst ms as information, and the phone check (task 6.2) confirms there's no stutter. Lower budgets are the fallback, but at 48 units the BUILDER beat the PAINTER only 57% of the time.

### 7. The meter as planner moves

While `meter === max` and the board is falling, the depth-1 moves also include:

- **`rinse`**, if `pending > 0`. The pair still has to be placed, so this is a Rinse followed by the best placement, with pending set to 0 in the snapshot.
- **`bomb@c`**, for each column `c` the pair can reach: move the pivot to `c`, fire Bomb, then place.

These moves are rated like any others, plus `rinseBias` or `bombBias`, so the PAINTER Bombs for stains and the ROOKIE avoids the meter. The danger Rinse overrides the plan: with a full meter, always Rinse once pending ≥ `rinseAt`, or when the spawn column's height plus the pending gunk's rows would reach the spawn row. Firing counts against the action pace. Steering puts the pivot over the chosen column before the Bomb bit is sent, so the Bomb's target is the one that was planned.

### 8. The bot's random stream

`createRival(id, matchSeed)` seeds its stream with `seedRng(matchSeed ^ hashId(id))`, using `src/core/rng.js` and a small integer string hash. The bot's own state lives outside the match, as sparring's does:

- `rng`, the bot's random stream
- `job`, the current plan
- `cooldown`, `waited` and `pairs`, as in sparring

The stream advances only when a rank is drawn, once per pair. Replays need nothing from the bot.

### 9. Runner and scenes

- **The runner.** `readRivalInput(board, opponent)` is the only API change. `MatchRunner.advance` passes `(this.rival, this.state)`. The sparring call sites ignore the second argument.
- **ModeSelect** starts Ladder with `{mode: 'ladder', rival: 1}`.
- **MatchScene** reads `data.rival` (default 1, kept in 1–5 by `rivalNumber` in `src/match/ladder.js`) and builds `createRival(\`rival${n}\`, seed)`. It shows the label, filled in from `FLOW.rivalLabel` (`RIVAL 3 · PAINTER`, or `#3 PAINTER` in portrait), and passes `rival` to Result in the scene data.
- **ResultScene** names the rival in the mode line (`LADDER · RIVAL 3 · PAINTER`), so the stat rows and their places are unchanged. Play again sends `{mode, rival: next}`: `next = outcome === 'win' ? (rival % 5) + 1 : rival`. Leaving for the title drops it.
- **Pause → quit** goes to the title, so the climb resets for free.
- **The `KeyV` debug key** (`rival`) restarts the match with a new seed against the next rival and updates the scene's rival. The hint gains `V rival`.

*Alternative:* keep the climb in the Phaser registry. Scene data is explicit, the existing flow already uses it, and it resets naturally. Chosen.

### 10. Layout

A `rivalLabel` text place is added to `match.ladder` in every layout:

- **Landscape:** above the rival's pending gunk, in both modes
- **Portrait:** in its short form at the top of the rival's column, beside the player's pending gunk; the reserved gunk area narrows to 240 px to make room

Each place is a box the label is centered in, with its size and form (`long` or `short`).

The overlap tests gain the label, with the longest label string measured. The landscape fixture is regenerated (`UPDATE_LANDSCAPE=1`) because the label is a new Ladder object.

### 11. `npm run sim`

- **Scripts.** `scripts/sim.js` reads the options (`--matches`, `--rivals`, `--seed`, `--quick`, `--workers`, default `min(4, cores)`). It builds the match list and sends chunks to `scripts/simWorker.js` through `node:worker_threads`. It gathers the per-match records in seed order, so the report doesn't depend on the worker count.
- **One match.** `createVersus(seed)` with the two bots, run with `stepVersus` until an outcome or `SIM.maxTicks` (36,000 ticks, 10 minutes of play). The worker times each bot call with `performance.now()`, which is allowed because scripts aren't pure, into a histogram of 0.05 ms buckets. It records: the outcome, ticks, both scores, chains, attacks, gunk, stain matches, rinses, bombs, the most units, the worst ms and the histogram, from which the report takes p99.9.
- **Sides.** The seeds alternate which bot plays side 0.
- **Seeds.** `seed + i`, with a default first seed of 1.
- **Output.** A plain-text table, then the pass checks. The script exits 1 if any check fails.
- **Config.** `SIM` config (`maxTicks`, matches, quick matches, thresholds) lives in `scripts/simConfig.js`. It is tooling, not rules.
- **CI.** `ci.yml` adds `- run: npm run sim -- --quick` after `npm run check`.

### 12. Testing approach

- **Unit tests.** They use ASCII fixtures to cover:
  - takes a visible splat
  - a lookahead-2 setup move that lookahead 1 misses
  - the Rinse floor
  - the Bomb aim
  - top-out avoidance
  - reachability behind a tall column
- **Property-style tests** over seeded sim matches cover:
  - units per tick never above the budget
  - inputs identical across two runs
  - `rng`/`gunkRng` blindness
  - rival inputs never change the boards
- **A small style test** runs 20 matches against sparring and checks the distinct-styles scenario.
- **The sim.** A test runs `--quick --rivals 1,2 --matches 4` in-process for its shape, without strength checks.

## Risks / Trade-offs

- [**The strength order may not come out monotonic at first**] → Pace, lookahead, budget and pick tightness are four independent levers. Task 4 tunes them against the sim before anything else depends on them. The full run is local, and CI checks the cheaper order only.
- [**Sim runtime in CI**] → 100 matches across 4 workers. If the quick run goes over two minutes, lower `SIM.maxTicks` for quick mode, or cut the quick count to 16. Either way the report states it.
- [**Phones are slower than the dev box, and tick times can't be measured reliably here**] → The unit budget caps the work per tick exactly. The manual Android check against the ACE confirms there's no hitch, and smaller BUILDER and ACE budgets (with retuning) are the fallback.
- [**Bots can't plan for gunk landing**] → This is fair by design. The pending height penalty stands in. SA-11's adaptation can react after drops.
- [**The weighted choice looks like variety but isn't SA-11's variety**] → The proposal says so, and the `--variety` metrics come only in SA-11.
- [**The rival label changes the landscape fixture**] → This is expected. It is regenerated deliberately, as it was for the meters in SA-9.

## Migration Plan

There is no engine, rules or replay format change. Stored replays and hashes stay. The sparring-based tests keep working, because the extra `opponent` argument is ignored. Rollback means reverting the branch.
