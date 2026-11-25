# Proposal

## Why

Vikunja: **SA-4**. Target version: **0.0.4**. The engine can drop pairs but not splat them. This adds the rules that make it a game: matching, chains and score, plus the replays that keep results provable from here on.

## What Changes

- Four or more connected blobs of one color splat; the rest fall, and this repeats until nothing matches.
- Score for each step of a chain, from splat size, number of colors and chain position. Chains pay most. Values are our own and live in `src/config/rules.js`.
- `step()` returns the tick's events (lock, splat, settle, chain end, match over) for rendering.
- Replays: record a match's seed and inputs, play them back, and compare a state hash. Stored replays run in `npm test` and in Chromium.
- `npm run replays` regenerates the stored replays after an intended rules change.

## Non-goals

- No rendering, keyboard or match loop (SA-5, SA-6). The game looks the same apart from its version.
- No stains, gunk, attacks or meter (SA-7 to SA-9), and no win bonuses, speed ramp or anti-farming.
- No `rulesVersion`, run records or `npm run verify` (SA-12). A stored replay is a test file, not a run record.
- No all-clear bonus and no points for soft drops.

## Capabilities

### New Capabilities
- `splat-rules`: matching, gravity chains, scoring and engine events.
- `replays`: recording, playback and state hashes.

### Modified Capabilities
- `board-engine`: settling now repeats with splats, and top-out waits for the chain to finish.

## Impact

- New: `src/core/splat.js`, `src/core/replay.js`, `scripts/replays.js`, `tests/core/replays/*.json`, their tests and an e2e spec.
- Changed: `src/core/engine.js`, `src/config/rules.js`, existing engine tests, README, CHANGELOG, `package.json`.
- No new dependencies.
