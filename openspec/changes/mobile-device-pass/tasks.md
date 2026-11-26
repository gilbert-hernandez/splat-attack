# Tasks

## 1. Page

- [ ] 1.1 Update the viewport meta and page CSS (touch-action, overscroll, selection, callout, tap highlight) and add `src/page.js` for `contextmenu`, `selectstart`, `dblclick` and iOS `gesture*`; set `disableContextMenu`; verify with browser tests on an emulated phone that a pinch and a drag on the letterbox don't zoom or scroll (with a control page showing the pinch does zoom without the change), a long press selects nothing and opens no menu, and gestures and buttons still work
- [ ] 1.2 Fit `#game` to the safe areas with fixed positioning and `env()` padding; verify with browser tests using `Emulation.setSafeAreaInsetsOverride` in portrait and landscape that the canvas lies inside the insets and the screen shape comes from the inner space, that no insets change nothing, and that `e2e/landscape.spec.js` passes unedited

## 2. Pause on focus loss

- [ ] 2.1 Let `ignoreWindowBlur` pass untrusted events and add helpers to blur the window and hide and show the page
- [ ] 2.2 Open Pause from `MatchScene` on `BLUR` and `HIDDEN`; verify with browser tests that hiding mid-match pauses without advancing and stays paused when shown again, a blur pauses and releases a held key and a held finger, a blur while paused changes nothing, a blur during the game-over message pauses it, a hidden page after the match has finished still reaches the result, and menus don't change

## 3. Text

- [ ] 3.1 Let `Button` take a size from its layout place, and raise text sizes in the landscape touch layout to at least 21; verify with a unit test checking every text size in each orientation and mode against 12 CSS px at 375×553 and 568×320, the existing layout tests, and a browser test reading the rendered sizes at 568×320 in touch mode; `e2e/landscape.spec.js` passes unedited

## 4. Recording

- [ ] 4.1 Add `--touch` to `npm run record` (390×844 with touch, menus and pause by CDP touch, greedy play); verify by running both routes and watching the videos

## 5. Docs and checks

- [ ] 5.1 Update the README (phone behavior, the touch recording, testing on a phone); verify each statement against the code
- [ ] 5.2 Run `openspec validate mobile-device-pass --strict`, `npm run check`, and `npm run e2e` twice with `--workers=4`; all pass

## 6. Device pass

- [ ] 6.1 Manual check: run `npm run dev -- --host`; on a real iPhone (Safari) and a real Android phone (Chrome), play a full Endless match in each orientation and check every acceptance criterion: no scroll, zoom, selection or menus; notch, home bar and browser bars covering nothing; readable text; pausing when switching apps and locking the screen. Record the results in the Vikunja task
- [ ] 6.2 Tune `src/config/touch.js` and button places from the device pass, if needed; verify with `npm run check` and `npm run e2e`, and list any changes in the CHANGELOG

## 7. Finish

- [ ] 7.1 Bump to 0.1.4 and add the CHANGELOG.md section for SA-29; verify `npm test` passes
