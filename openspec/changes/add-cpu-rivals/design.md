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
| `src/config/rivals.js` | `RIVALS`: five frozen profiles, plus `validateRivals()` |
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
  pickTop,         // the weighted choice draws from this many best moves
  pickWeights,     // e.g. [70, 20, 10]: chance per rank, out of 100
  weights: { points, attack, chainSetup, stainMatch, stainSetup, height, spawnColumn, holes, gunk },
  meter: { rinseAt, bombWhenHeight, bombBias },
}
```

`validateRivals()` runs at import. It throws, naming the rival, if `lookahead` exceeds `RULES.nextPairs + 1`, if `pickWeights` doesn't match `pickTop`, or if a value isn't a positive integer where one is required.

Starting styles (numbers are first guesses, tuned against the sim in task 4):

| Rival | Style | Pace (act/drop) | Look | Beam | Budget | Pick | Character |
|---|---|---|---|---|---|---|---|
| 1 | ROOKIE | 10/40 | 1 | 1 | 6 | top 4, loose | Stacks near the middle, takes splats when it sees them, Rinses late |
| 2 | RUSHER | 4/6 | 2 | 4 | 12 | top 3 | High `attack`, low `chainSetup`. Fires small chains fast and Bombs often |
| 3 | PAINTER | 6/20 | 2 | 6 | 16 | top 3 | High `stainMatch` and `stainSetup`. Splats on its own stains and Bombs to paint |
| 4 | BUILDER | 6/24 | 3 | 6 | 24 | top 2 | High `chainSetup`, low `attack`. Holds for big chains and Rinses to protect them |
| 5 | ACE | 3/4 | 3 | 8 | 32 | top 2, tight | Balanced weights, fast, uses the meter well, rarely settles for less |

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

*Reachability.* A placement counts only if the pair can reach it from the spawn cell in the current grid. The planner runs a small check: walk the columns between the spawn column and the target at the pair's row, and try the needed rotations using the engine's `movePair` and `rotatePair` on a grid copy. Without this check, planned moves can turn out impossible behind tall columns. The check costs one work unit per placement.

### 5. Rating

`rate(result, weights, snapshot)` is a weighted integer sum:

- **`points`:** chain points from the move
- **`attack`:** `floor(power / powerPerGunk)`, minus any that just cancels own pending gunk, plus a smaller credit for that cancel
- **`chainSetup`:** the longest chain a single extra blob could trigger. For each column top and each color that occurs on the board, drop one blob and resolve. This costs up to 35 resolves, so it counts as `ceil(probes / 8)` work units. It runs only for states that reach the final depth of the beam.
- **`stainMatch`:** stain matches made now
- **`stainSetup`:** blobs resting on a stain of their own color
- **`height`:** the sum of column heights, plus pending gunk as rows
- **`spawnColumn`:** a large penalty growing with the spawn column's height, and a fatal value for top-out
- **`holes`:** empty cells under a filled cell in the same column
- **`gunk`:** gunk left on the board

Scores at each depth add up the move's immediate terms. Board-shape terms count only on the final state.

*Alternative:* learned weights or Monte Carlo rollouts. Rollouts need hidden pieces (unfair) or random guesses (high cost). Rejected for the demo.

### 6. Incremental beam search under a work budget

A plan is a job object with a queue of nodes to expand: `{depth, snapshot, firstMove, score}`. `stepPlan(job, units)` expands nodes until it runs out of units. Simulating and rating one placement costs one unit plus the reachability unit. A `chainSetup` probe batch costs its own units. The job keeps:

- `best`, the best first move found so far, updated after each depth-1 placement so that a fallback always exists after the first unit
- `frontier`, the top `beam` nodes at each depth, sorted by score and tie-broken by column and then orientation for determinism

The job starts when a pair spawns, from a snapshot taken then. The bot can't spend units during settle or splat phases, because the board it would plan for isn't known yet. When the job finishes, the bot picks a move:

1. Group the depth-1 moves by the best score reachable from each.
2. Take the top `pickTop`.
3. Draw a rank with `pickWeights` from the bot's stream.

The rank is drawn once per pair, so the cost and the choice don't depend on how many ticks planning took.

Steering reuses the sparring order: rotate, move, then soft-drop, all under the rival's pace. If the pair is grounded (`pair.budget < RULES.lockBudget`) while the job still runs, the job stops, and the bot steers to `best` or soft-drops.

Rough budget arithmetic: about 22 placements per pair. ACE at look 3 with beam 8 needs 22 + 8×22 + 8×22 ≈ 374 placements, plus probes on about 176 leaves. That is about 550 units, or 17 ticks at 32 units per tick. At level 1 a pair takes about 32 ticks per row to fall, so planning finishes before the pair has dropped one row. A placement costs a few microseconds, so 32 units cost well under 1 ms. The sim measures the worst tick, and the budgets are tuned down if any tick goes over.

### 7. The meter as planner moves

While `meter === max` and the board is falling, the depth-1 moves also include:

- **`rinse`**, if `pending > 0`. The pair still has to be placed, so this is a Rinse followed by the best placement, with pending set to 0 in the snapshot.
- **`bomb@c`**, for each column `c` the pair can reach: move the pivot to `c`, fire Bomb, then place.

These moves are rated like any others. The profile's `meter.rinseAt` is a hard floor: always Rinse once pending ≥ `rinseAt` and pending + height would reach the spawn row. `bombBias` adds a style-specific bonus, so the PAINTER Bombs for stains and the RUSHER Bombs early. Firing counts against the action pace. Steering puts the pivot over the chosen column before the Bomb bit is sent, so the Bomb's target is the one that was planned.

### 8. The bot's random stream

`createRival(id, matchSeed)` seeds its stream with `seedRng(matchSeed ^ hashId(id))`, using `src/core/rng.js` and a small integer string hash. The bot's own state lives outside the match, as sparring's does:

- `rng`, the bot's random stream
- `job`, the current plan
- `cooldown`, `waited` and `pairs`, as in sparring

The stream advances only when a rank is drawn, once per pair. Replays need nothing from the bot.

### 9. Runner and scenes

- **The runner.** `readRivalInput(board, opponent)` is the only API change. `MatchRunner.advance` passes `(this.rival, this.state)`. The sparring call sites ignore the second argument.
- **ModeSelect** starts Ladder with `{mode: 'ladder', rival: 1}`.
- **MatchScene** reads `data.rival` (default 1, clamped to 1–5) and builds `createRival(\`rival${n}\`, seed)`. It shows the label, filled in from `FLOW.rivalLabel` (for example `RIVAL 3 · PAINTER`), and passes `rival` to Result through the stats.
- **ResultScene** shows the rival row. Play again sends `{mode, rival: next}`: `next = outcome === 'win' ? (rival % 5) + 1 : rival`. Leaving for the title drops it.
- **Pause → quit** goes to the title, so the climb resets for free.
- **The `KeyV` debug key** (`rival`) restarts the match with a new seed against the next rival and updates the scene's rival. The hint gains `V rival`.

*Alternative:* keep the climb in the Phaser registry. Scene data is explicit, the existing flow already uses it, and it resets naturally. Chosen.

### 10. Layout

A `rivalLabel` text place is added to `match.ladder` in every layout:

- **Landscape:** above the rival's pending gunk, in both modes
- **Portrait:** just above the half-size rival board

The overlap tests gain the label, with the longest label string measured. The landscape fixture is regenerated (`UPDATE_LANDSCAPE=1`) because the label is a new Ladder object.

### 11. `npm run sim`

- **Scripts.** `scripts/sim.js` reads the options (`--matches`, `--rivals`, `--seed`, `--quick`, `--workers`, default `min(4, cores)`). It builds the match list and sends chunks to `scripts/simWorker.js` through `node:worker_threads`. It gathers the per-match records in seed order, so the report doesn't depend on the worker count.
- **One match.** `createVersus(seed)` with the two bots, run with `stepVersus` until an outcome or `SIM.maxTicks` (36,000 ticks, 10 minutes of play). The worker times each bot call with `performance.now()`, which is allowed because scripts aren't pure. It records: the outcome, ticks, both scores, chains, attacks, gunk, stain matches, rinses, bombs, the worst units and the worst ms.
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
- [**Phones are slower than the dev box**] → The 1 ms target leaves plenty of room in a 16 ms frame on a phone that is 5× slower. The manual Android check confirms there's no hitch, and a smaller ACE budget is the fallback.
- [**Bots can't plan for gunk landing**] → This is fair by design. The pending height penalty stands in. SA-11's adaptation can react after drops.
- [**The weighted choice looks like variety but isn't SA-11's variety**] → The proposal says so, and the `--variety` metrics come only in SA-11.
- [**The rival label changes the landscape fixture**] → This is expected. It is regenerated deliberately, as it was for the meters in SA-9.

## Migration Plan

There is no engine, rules or replay format change. Stored replays and hashes stay. The sparring-based tests keep working, because the extra `opponent` argument is ignored. Rollback means reverting the branch.
