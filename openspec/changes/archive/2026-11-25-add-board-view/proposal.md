# Proposal

## Why

Vikunja: **SA-5**. Target version: **0.0.5**. The rules work but nothing shows them. This draws the engine in the Match scene and connects the keyboard, so the game can be seen and played for the first time.

## What Changes

- Match runs the engine at 60 ticks per second and draws it: smooth falls, landings, splats, and bridges between neighbors of one color.
- Next-pair preview (both known pairs) and a ghost showing where each half will land.
- Keyboard: A/D or ←/→ move, S or ↓ soft drop, Q/E or Z/X rotate. Held moves repeat; timings are in config.
- The view can't change the rules. Stored replays give the same hash when played through it.
- E2E tests advance engine ticks directly instead of waiting on the clock.
- The sample blobs, stains and gunk in Match are removed.

## Non-goals

- No live score, speed ramp, result on top-out, restart or other debug keys (SA-6). After a top-out the board stays on screen; Esc and Quit still work.
- No rival play: Ladder shows the player's live board beside an empty rival board (SA-8, SA-10).
- No stains, gunk or meter. Space does nothing.
- No splat FX, shake or score popups (SA-15), no pause on blur (SA-13), no gamepad, touch or remapping.
- No rules or scoring changes: stored replay hashes stay as they are.

## Capabilities

### New Capabilities
- `board-view`: drawing a match, its animation, preview and ghost.
- `match-input`: keyboard controls, held-key repeat and how real time becomes ticks.

### Modified Capabilities
- `replays`: stored replays are also checked through the view.
- `browser-testing`: tests drive ticks directly, and cover the board and controls.

## Impact

- New `src/match/` (tick runner, input), `src/view/` (board model and Phaser drawing), `src/core/landing.js`, `src/config/view.js` and `input.js`.
- `MatchScene`, `eslint.config.js`, e2e support and specs, `scripts/record.js`, README. No new dependencies.
