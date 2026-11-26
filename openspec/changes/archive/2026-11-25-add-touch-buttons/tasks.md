# Tasks

## 1. Art entries

- [x] 1.1 Add `sa_ui_touch_button.png` (72×72, 2 frames) and the four 48×48 icons to the manifest and `ASSETS.md`, replacing its note that they come with SA-28; verify with `npm test` and that the dev console lists them as placeholders

## 2. Mode and layout

- [x] 2.1 Add the pure `InputMode`; verify with unit tests for the starting mode, each switch, keys the game doesn't use, and no switch to keyboard while a finger is down
- [x] 2.2 Add button places, the meter slot and the landscape touch Ladder to the layout config, and the mode to `layoutFor` and `LayoutManager`; verify with unit tests for overlaps and bounds in both orientations, modes and all portrait heights, for targets of 48 CSS px at 375×553 and 568×320, and that keyboard landscape is unchanged
- [x] 2.3 Connect window events in `main.js`, switch the title hint and hide the debug hint in touch mode; verify with browser tests for the starting mode on an emulated phone and desktop, and the title hint after a touch, a mouse press, a game key and another key; `e2e/landscape.spec.js` passes unedited

## 3. Menu buttons

- [x] 3.1 Give `Button` the press rule (own pointer, no cancelled touches, hover for the mouse only); verify with browser tests for cancel, two fingers, sliding off, look after a tap, and that all existing button tests pass unedited
- [x] 3.2 Make Result ignore touch presses until its delay ends; verify with browser tests for a tap just after it opens, a finger held from the match, and a tap after the delay

## 4. Match buttons

- [x] 4.1 Add `MatchInput.turn`; verify with unit tests that it acts once, combines with keys and drags, and is dropped by `releaseAll`
- [x] 4.2 Add `TouchButton` and the three buttons to `MatchScene`, with placeholder symbols and more touch pointers; verify with browser tests at 375×667 and 844×390 for each button, sliding off, cancel, pause and resume looking normal, and hidden in keyboard mode
- [x] 4.3 Verify with browser tests: rotating during a drag, a button held before a drag, two buttons at once, two fingers landing in one event, a switch by touch over a hidden button, a switch in landscape Ladder keeping the match, keys during a drag, and a match played with buttons and gestures replaying to the same hash

## 5. Whole flow

- [x] 5.1 Add the touch-only flow test in both modes and orientations (title, mode select, match, pause, resume, result, play again, title); verify it passes
- [x] 5.2 Update the README (buttons, modes, layouts, tests); verify each statement against the code

## 6. Finish

- [x] 6.1 Run `openspec validate add-touch-buttons --strict`, `npm run check`, and `npm run e2e` twice; all pass
- [x] 6.2 Manual check: run `npm run dev -- --host`; on a phone play Ladder and Endless in both orientations by touch alone and check button reach, rotating while dragging, pause, the hint, no stuck highlights, and play again; on a desktop check that no buttons show, the mouse and keys work as before, and nothing moved
- [x] 6.3 Bump to 0.1.3 and add the CHANGELOG.md section for SA-28; verify `npm test` passes
