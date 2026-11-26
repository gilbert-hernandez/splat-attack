# Proposal

## Why

Vikunja: **SA-29**. Target version: **0.1.4**. Touch play works in an emulated browser (SA-26 to SA-28), but a real phone browser still scrolls, zooms, selects text and opens long-press menus over the game, lets the notch and system or browser bars cover controls, keeps the match running when the app goes to the background, and shows text too small to read in landscape. This change fixes those problems, adds a portrait touch recording, and finishes with a match on a real iPhone and a real Android phone to tune the touch settings.

## What Changes

- The page blocks scrolling, pinch and double-tap zoom, pull-to-refresh, text selection, the long-press menu and the iOS callout, everywhere on the page, including the letterbox bars.
- The game fits inside the safe areas (notch, home bar) and the visible viewport, so system and browser bars don't cover controls. The screen shape is chosen from that space.
- Losing focus or going to the background opens Pause, which moves here from SA-13. The game doesn't resume by itself when the page comes back.
- All player-facing text is at least 12 CSS px on the smallest supported windows. This affects landscape touch mode only; keyboard mode at 960×540 doesn't change.
- `npm run record -- --touch` saves a portrait match played by touch: it taps through the menus and pauses with the pause button.
- After the device pass, the touch settings in `src/config/touch.js` are tuned. Any changes are listed in the CHANGELOG.

## Non-goals

- No fullscreen API, orientation lock, home-screen install or vibration (iPhone Safari can't do the first two; SA-17 can consider install).
- No higher-resolution canvas. The game keeps its pixel-art canvas, and text gets readable by size (see design).
- No new HUD or pause screen content (SA-13), and no change to rules, stored replays or `rulesVersion`.
- If time runs short, the recording and tuning can slip without moving SA-7.

## Capabilities

### New Capabilities
- `mobile-browser`: blocked page gestures, safe areas, pausing on focus loss, and minimum text size.

### Modified Capabilities
- `responsive-layout`: the screen shape comes from the space inside the safe areas.
- `match-input`: a focus loss pauses the match instead of only releasing input.
- `browser-testing`: covers the new behavior with touch and multi-touch, and adds the portrait touch recording.

## Impact

- `index.html` (viewport and CSS), `main.js` (page listeners, safe-area size), `MatchScene` (pause on blur and hidden), the layout config (landscape touch text sizes), `scripts/record.js`, `e2e/support.js`.
- New unit and browser tests; README, CHANGELOG, maybe `src/config/touch.js`. No new dependencies.
