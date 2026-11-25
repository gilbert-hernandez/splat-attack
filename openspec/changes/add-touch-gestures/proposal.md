# Proposal

## Why

Vikunja: **SA-27**. Target version: **0.1.2**. Since SA-26 the game fits a phone, but a match there can't be controlled. This adds drag, tap and drag-down gestures that become the same per-tick input masks as keys, so the engine, scores and replays don't change.

## What Changes

- The pair follows a sideways drag, one column per step. Fast drags queue moves, one per tick, and a lock clears the queue.
- A tap rotates clockwise.
- Dragging down soft drops while held. A lock ends it until the finger lifts.
- Each drag keeps one axis, chosen in favor of sideways. Thresholds are in config.
- The first finger down owns the gesture. Pause, focus loss, touch cancel and layout changes release it.
- Gestures work anywhere on the game during a match, in both orientations, and alongside the keyboard. The mouse doesn't make gestures.

## Non-goals

- No on-screen buttons, so no counterclockwise rotation or pause by touch yet; no hints for touch; no second finger doing something else (SA-28).
- No blocking of page scroll, zoom, selection or long-press menus, and no pause on focus loss (SA-29). Final thresholds are also tuned there.
- No hard drop, upward gesture or mouse dragging.
- No change to rules, stored replays, `rulesVersion` or what any key does.

## Capabilities

### New Capabilities
- `touch-input`: gestures in a match and how they become engine input.

### Modified Capabilities
- `match-input`: pausing or losing focus also releases touch.
- `browser-testing`: tests cover gestures with real touch events.

## Impact

- New `src/match/gestures.js` (pure) and `src/config/touch.js`; `MatchScene` listens to touch and combines both inputs.
- New unit tests and `e2e/touch.spec.js`; README and CHANGELOG.
- No new dependencies or art.
