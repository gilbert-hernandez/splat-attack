# Proposal

## Why

Vikunja: **SA-10**. Target version: **0.1.8**. Ladder is the scored mode, and today every Ladder match is against the sparring rival, a one-ply greedy stand-in from SA-8. The demo needs five CPU rivals that look ahead, play in recognizable styles and get stronger from rival 1 to rival 5. It also needs a headless simulator to prove that. The meter (SA-9) is in the engine now, so the bots can plan with everything a player has. SA-11 (variety and adaptation) and SA-12 (laps and scoring) build on the bots and the simulator added here.

## What Changes

- **Five CPU rivals in `src/ai/`.** They share one planner, and each has a style profile in config. The ids `rival1` to `rival5` match the art keys that david draws in SA-22. Working style names are Rookie, Rusher, Painter, Builder and Ace. Each profile sets four things:
  - **Pace:** how often the rival moves or rotates, and how long it waits before soft-dropping
  - **Lookahead:** how many visible pairs it plans with. This is the falling pair plus up to the two shown in the preview.
  - **Thinking budget:** work units per tick
  - **Weights:** what it values, such as points, attack sent, chain setup, stain matches, a low stack, and keeping the spawn column clear. The profile also sets how often it settles for a weaker move and its meter habits.
- **The planner evaluates boards; it doesn't follow scripts.** It tries placements of the falling pair and the visible next pairs. It simulates each one with the engine's own gravity, splat, stain and gunk rules, scores the result with the rival's weights, and keeps the best few at each depth. A full meter adds Rinse and Bomb options, which it rates the same way. When the plan is done, the bot picks among the strongest moves with a seeded weighted choice, then turns, moves and drops toward the move it picked.
- **Fair and reproducible.**
  - **No hidden information:** a bot sees only what a player could see. That is both grids and stains, its falling pair, the preview pairs, pending gunk, both meters and both scores. It never reads the piece or gunk random streams or anything past the preview.
  - **Same input path as the player:** it gives its moves as the same per-tick input mask.
  - **Seeded:** its random choices come from a stream seeded from the match seed and the rival id. Same match seed + same player inputs = same rival inputs, in Node and in browsers.
- **A fixed budget per tick, never the clock.** Planning is split into steps that cost work units, mostly one per simulated placement. Each tick the bot spends at most its budget, so a frame never waits on a long search. If the pair is grounded before planning ends, the bot plays the best move found so far. Weaker rivals get smaller budgets and shallower plans, so they think more slowly as well as worse.
- **Ladder climbs the five rivals (until SA-12).** Choosing Ladder starts at rival 1. Winning moves the next match to the next rival, and after rival 5 it goes back to rival 1. A loss or draw replays the same rival. Returning to the title resets to rival 1. The match shows which rival is playing (number and style name) next to the rival's board, and so does the result. A new debug key moves to the next rival and restarts the match.
- **`npm run sim`.** It plays headless bot-vs-bot versus matches in Node on fixed seeds, spread across worker threads. It reports, for each pairing:
  - win, loss and draw rates, plus matches cut off at the tick limit
  - match length
  - longest and average chain
  - score average and spread
  - gunk sent and meter uses
  - the bot's worst work units and worst milliseconds in one tick

  **Pass:** with 100 matches per pairing, each rival beats the rival below it in at least 60% of matches, and rival 1 beats the sparring rival in more than half. `npm run sim -- --quick` plays 20 matches per pairing and checks only that each rival wins more than half against the one below. CI runs `--quick`. Options choose the match count, the rivals and the first seed. It exits non-zero when a check fails.
- **The sparring rival stays as a yardstick.** It no longer plays Ladder. It stays as the sim's fixed baseline and as the generator for the stored versus replay. That replay keeps its inputs, so no replay or hash changes.
- **The runner passes the opponent's board.** `readRivalInput(board, opponent)` gives the bot both boards. Nothing else about the runner changes.

## Non-goals

- No per-match variation (risk, patience, preferred colors or area). No mid-match adaptation to the player's threats, score gap or meter. No `--variety` check. These are SA-11. The weighted choice here only serves strength. It is not a variety target.
- No laps, run-over, ladder bonuses, `rulesVersion`, run records or `npm run verify` (SA-12). The rival climb is a stand-in.
- No rival portraits, names or dialogue beyond the placeholder label (SA-13, SA-14, SA-22), and no HUD work beyond that label.
- No balance pass on the rules. Bot-vs-bot match length and score are reported, not gated, and SA-15 tunes them.
- No engine or rules changes. No new input bits and no replay format change.

## Capabilities

### New Capabilities
- `cpu-rivals`: the five rival profiles; the planner (lookahead over visible pairs, evaluation, Rinse and Bomb options, seeded weighted choice); what a bot may see; the work budget per tick; reproducibility; pacing; the Ladder climb; and the rival label.
- `rival-sim`: `npm run sim`, with its pairings, report, pass checks, `--quick` mode, options and CI step.

### Modified Capabilities
- `versus-match`: the sparring rival no longer plays Ladder. It stays as the sim baseline and the replay generator. The rival's input receives both boards.
- `debug-tools`: a key moves to the next rival and restarts the match.
- `responsive-layout`: a place for the rival label in portrait and landscape.
- `endless-mode`: in Ladder, the result shows which rival was played, and playing again follows the climb.
- `code-quality`: the purity lint covers the new rival config. CI runs the quick sim.

## Impact

- **New:**
  - Bots: `src/ai/planner.js`, `src/ai/evaluate.js`, `src/ai/rival.js` and `src/ai/view.js` (what a bot may see)
  - Config: `src/config/rivals.js`
  - Sim: `scripts/sim.js` and its worker
  - Tests for all of the above
- **Changed:**
  - Scenes and match: `src/match/runner.js` (opponent argument), `src/scenes/MatchScene.js`, `src/scenes/ResultScene.js`, `src/scenes/ModeSelectScene.js` (rival index through scene data)
  - Debug: `src/debug/debugKeys.js`, `src/config/display.js` (rival key and hint)
  - Config: `src/config/layout.js` (label places), `src/config/flow.js` (label text)
  - Tooling: `eslint.config.js` (pure config list), `.github/workflows/ci.yml` (quick sim step), `package.json` (`sim` script)
  - Tests and docs: e2e tests for the label, the climb and the debug key, `README.md`, `CHANGELOG.md`
- No engine changes, so every stored replay and hash stays the same. No new dependencies and no new asset keys. Worker threads come from Node itself.
