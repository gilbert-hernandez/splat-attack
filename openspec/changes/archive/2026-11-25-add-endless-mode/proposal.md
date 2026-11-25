# Proposal

## Why

Vikunja: **SA-6**. Target version: **0.1.0** (closes M1). A match can be played but never speeds up, shows no score and has no way on after a top-out. This makes Endless a game from start to finish.

## What Changes

- Falling speeds up as pairs are played: one level per 10 pairs. First values, all in config.
- Live score and level on screen during a match.
- A top-out shows GAME OVER over the final board, then the result: score, level, pairs, longest chain and time.
- Play again (button, Enter or Space) starts a new match in the same mode with a new seed; Esc or a button returns to the title.
- Debug keys in dev builds: set the next pair, load a board, freeze, step one tick, fast-forward, force the end. `R` now forces the end instead of jumping straight to Result.
- `npm run record` plays a whole Endless match. The first recording goes on the ticket.
- `npm run release:archive` builds the `dist/` archive and its SHA-256 for GitHub pre-releases.

## Non-goals

- No win, rivals or Ladder run: Ladder stays a solo board, with the same speed ramp and ending (SA-8, SA-12).
- No run records, `rulesVersion` or personal bests (SA-12, SA-13), no score breakdown, HUD art or restart from Pause (SA-13), no score popups or callouts (SA-15).
- No change to matching or points. Debug keys for gunk and the meter come with SA-8 and SA-9.
- No balance pass: the ramp is tuned by playing and again in SA-15.

## Capabilities

### New Capabilities
- `endless-mode`: the loop from start to top-out, result and play again, with live score.
- `debug-tools`: developer keys in a match.

### Modified Capabilities
- `board-engine`: fall speed rises with pairs played.
- `board-view`: the final board stays until the result screen.
- `project-setup`: the dev result key goes through the normal ending.
- `browser-testing`: browser tests cover the full loop and the debug keys; the recording covers a whole match.
- `versioning`: a release archive and checksum.

## Impact

- `src/core/engine.js` (one new state field), `src/config/rules.js`, `flow.js`, `display.js`; new `src/match/stats.js` and `src/debug/`; `MatchScene`, `UIScene`, `ResultScene`, runner.
- Stored replays change: scores and hashes move with the speed ramp, and expected values are rewritten.
- Scripts, e2e, README. No new dependencies.
