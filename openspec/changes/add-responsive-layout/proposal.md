# Proposal

## Why

Vikunja: **SA-26**. Target version: **0.1.1**. The game has one 960×540 screen, which is tiny on a phone held upright. This adds a portrait screen and moves every position into a layout config, so the touch tickets (SA-27 to SA-29) and Versus (SA-8) are built for both orientations from the start.

## What Changes

- Windows taller than they are wide get a portrait game: 360 wide and 640–780 tall, depending on the window. Other windows keep 960×540, unchanged.
- **BREAKING** for one current behavior: a tall desktop window (such as 700×900) now gets portrait instead of a small 960×540 canvas.
- Every scene takes its positions from a layout config and re-lays itself out when the window changes shape, without restarting.
- Rotating mid-match keeps the match and pauses it. A height change without a rotation (a browser bar hiding) re-lays out without pausing.
- Portrait Ladder: the player's board at 1×, next pairs beside it, the rival's board at half size, and reserved space for the meter, pending gunk and touch controls.
- Nine portrait art entries (SA-30) in the manifest and `ASSETS.md`, with placeholders.

## Non-goals

- No touch input or on-screen buttons (SA-27, SA-28). Until SA-28, a match on a phone can't be controlled, and Pause opens there only by rotating.
- No touch-button art entries: SA-28 adds them.
- No safe areas, scroll or zoom blocking, pause on blur or device testing (SA-29).
- No meter, pending gunk or live rival board; only their space is reserved (SA-8, SA-9). No match backgrounds or ladder panel on screen yet (SA-13, SA-14).
- No landscape redesign for phones, and no change to rules, scores or replays.

## Capabilities

### New Capabilities
- `responsive-layout`: choosing a screen shape, placing every scene in it, and changing it while running.

### Modified Capabilities
- `project-setup`: the base resolution is no longer fixed.
- `assets`: the art spec covers SA-30.
- `browser-testing`: tests cover both orientations and rotation.

## Impact

- New `src/config/layout.js` and `src/layout/`; positions leave `config/board.js` and `config/view.js`.
- `main.js`, all scenes except Boot, `BoardView`, `SpritePool`, `Button`, debug hint, manifest, `ASSETS.md`, README.
- The 700×900 scaling test changes; other e2e tests should pass unedited apart from where they import positions.
- No new dependencies.
