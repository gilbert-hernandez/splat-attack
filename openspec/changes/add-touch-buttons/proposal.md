# Proposal

## Why

Vikunja: **SA-28**. Target version: **0.1.3**. Gestures (SA-27) can't rotate counterclockwise or pause, and menus weren't built for fingers. This adds on-screen buttons and makes the whole flow, from the title to playing again, work by touch alone.

## What Changes

- Clockwise, counterclockwise and pause buttons in a match, and a reserved slot for the meter button (SA-9). They are below the board in portrait and beside the boards in landscape, with tap targets of at least 48 CSS px.
- Buttons work while another finger drags. Pressing one never starts a gesture.
- Touch and keyboard modes switch automatically. Match buttons show in touch mode only, and the title's hint matches the mode.
- In landscape touch mode, the Ladder boards move inward to make room. Keyboard mode at 960×540 is unchanged.
- Menu buttons ignore cancelled touches, follow only the finger that pressed them, and show no hover after a tap.
- The result ignores touches for a moment after it opens, as it does keys.
- The touch button and its four icons (SA-30) are in the manifest and `ASSETS.md`, with placeholders.

## Non-goals

- No working meter button (SA-9), only its space and icon.
- No blocking of page gestures, safe areas, pause on focus loss, high-DPI text, portrait recording or final tuning (SA-29).
- No settings for mode, handedness or button positions; no vibration.
- No change to gestures, rules, stored replays, `rulesVersion` or what any key does.

## Capabilities

### New Capabilities
- `touch-buttons`: on-screen match buttons, touch and keyboard modes, and how every button handles touch.

### Modified Capabilities
- `touch-input`: fingers on buttons act beside the finger that owns the gesture.
- `responsive-layout`: button places, and the landscape touch layout.
- `assets`: the touch button and icons.
- `endless-mode`: the result ignores touches for a moment.
- `browser-testing`: buttons, modes and the touch-only flow are covered.

## Impact

- New touch button and input mode modules; changes to `Button`, `MatchScene`, `MatchInput`, the Title, Result and debug hint, the layout config and manager, and `main.js` (more touch pointers).
- Manifest, `ASSETS.md`, unit and browser tests, README, CHANGELOG. No new dependencies.
