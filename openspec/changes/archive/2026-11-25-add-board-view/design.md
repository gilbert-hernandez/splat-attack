# Design

## Context

`step(state, input)` returns events; the grid already holds end positions when a fall or splat starts, so the view keeps its own picture of what is moving. Phaser 4 has no WebGL geometry mask. Phaser sometimes handles one keydown twice (seen in Gun Hands).

## Goals / Non-Goals

**Goals:** everything except sprite placement testable in Node; a second board (SA-8) is a second instance.

**Non-Goals:** final look and feel. Timings are first values to tune by playing.

## Decisions

- **Layers:** `src/match/` owns the state and calls `step`; `src/view/boardModel.js` (pure) turns state + events into what to draw; `src/view/BoardView.js` (Phaser) places pooled sprites from it. *Alternative:* sprites with tweens; they run on the wall clock, so pausing and exact tests get harder.
- **Animation clock:** the model counts its own ticks. It keeps ticking after the match is over, so no animation sticks.
- **Runner:** adds frame time, runs whole ticks, at most 5 per frame, and drops the rest. It records the replay and has a manual mode in which only `advance(n)` ticks. Tests reach these through `window.__GAME__`, which production doesn't have.
- **Smooth fall:** one row is 256 progress units, so normal speed is 1 px per tick and needs no interpolation between ticks. The engine keeps progress while grounded, so the model draws a grounded pair at progress 0, and limits downward movement per tick to the soft-drop speed so sliding off a ledge doesn't jump.
- **Moves and rotations** ease each half's offset to zero over 4 ticks. The engine's position is immediate; only the drawing lags. Floor kicks ease the same way.
- **Falls:** accelerating, `ceil(settleTicks × sqrt(rows / 13))` ticks, so the longest takes exactly `settleTicks` (12). Landing is 3 frames × 3 ticks and may run into the next pair; a splat or fall cuts it short. The 5 splat frames share `splatTicks` (24).
- **Top edge:** blobs crossing it are cropped (`setCrop`), so nothing covers the background art. *Alternative:* draw hidden rows; they'd overlap the HUD, and players shouldn't see blobs that don't match.
- **Ghost:** `src/core/landing.js` gives each half's resting cell. It's in core because bots need it too (SA-10). Drawn as the blob at low opacity, so its shape still identifies it.
- **Preview:** two `ui_next_box` frames, right of the player's board, at full scale so pixel art stays crisp.
- **Input:** `src/match/input.js` (pure) takes press/release by `event.code` and returns one mask per tick. A set of held codes ignores OS repeats and Phaser's double handling. Repeat: 10 ticks, then every 3. Taps during a settle are used up then, not saved for the next pair; held moves keep their charge. Soft drop keeps working into the next pair while held. *Alternative:* require a new press; safer against slips, but slower to play. Revisit after playing.
- **Read-only view:** ESLint blocks `src/view/` from importing the functions that change state. Model tests run on deep-frozen states, and e2e plays stored replays through the scene. *Alternative:* copy the state each tick; wasteful for no extra proof.
- **Seed:** drawn in the scene with `crypto.getRandomValues`, since core can't use randomness.

## Risks / Trade-offs

- [The model drifts from the grid in a long chain] → model tests compare them at every quiet tick over random matches and stored replays.
- [Long replays are slow in e2e] → ticks run in one batch with drawing updated per tick but not waiting for frames.
- [Easing feels laggy] → 4 ticks (67 ms), in config; 0 turns it off.
- [Top-out leaves no way on except Esc → Quit] → accepted until SA-6.
