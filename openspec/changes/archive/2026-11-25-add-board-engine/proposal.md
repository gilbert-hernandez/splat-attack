# Proposal

## Why

Vikunja: **SA-3**. Target version: **0.0.3**. Everything after this (splats, versus, bots, replays, score verification) runs on one deterministic rules engine. This builds its base: the board, the pieces and pair control.

## What Changes

- `src/core/`: a pure engine that advances one tick at a time from a seed and per-tick inputs.
- 7 × 12 visible board + 2 hidden rows, 5 blob colors, seeded pieces and a queue of two next pairs.
- Falling pairs: move, rotate both ways, wall and floor kicks, a flip in one-wide wells, soft drop, lock delay.
- After a lock, each half falls on its own. Top-out when the spawn cell is blocked after that settle.
- ASCII board fixtures for tests.
- Lint rules that fail on Phaser, randomness, the clock or non-integer math in `src/core/` and `src/ai/`, with a test proving each one.

## Non-goals

- No matching, splats, chains, scoring, events or replays (SA-4).
- No rendering, keyboard handling or held-key repeat (SA-5). The Match scene keeps its placeholder blobs, so the game looks the same apart from its version.
- No speed ramp (SA-6), stains, gunk, meter or bots. No hard drop.
- No `rulesVersion` yet (SA-12).

## Capabilities

### New Capabilities
- `board-engine`: the board, determinism, pieces, pair control, locking, settling and top-out.

### Modified Capabilities
- `code-quality`: adds engine purity checks.

## Impact

- New: `src/core/**`, `src/config/rules.js`, `tests/core/**`.
- Changed: `src/config/board.js` (takes its size from `rules.js`), `eslint.config.js`, README, CHANGELOG, `package.json`.
- No new dependencies.
