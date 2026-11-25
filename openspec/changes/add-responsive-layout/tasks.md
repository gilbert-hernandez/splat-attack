# Tasks

## 1. Baseline and layout

- [x] 1.1 Before any refactor, add an e2e that records every object's position and size in Title, ModeSelect, Match (both modes), UI, Pause and Result at 960×540 into a stored fixture; verify it passes twice in a row on the current code
- [x] 1.2 Add `src/config/layout.js` and the pure `screenFor` and `layoutFor`; verify with unit tests for 375×667, 390×844, 844×390, 960×540, square, very tall, very short and zero sizes, and that at portrait heights 640, 700 and 780 no match areas overlap or leave the screen
- [x] 1.3 Add the layout manager and `onLayout`, and start the game at the right size in `main.js`; verify with unit tests that one window change gives at most one layout change, and that a scene's callback is removed at shutdown
- [x] 1.4 Add the nine SA-30 entries to the manifest and `ASSETS.md`, and mention SA-30 in its introduction; verify `npm test` passes and the dev warning lists the new keys

## 2. Scenes

- [x] 2.1 Move Preload, Title and ModeSelect to the layout, with art keys per orientation; verify the 1.1 fixture is unchanged, and by e2e that every object is on screen in portrait
- [x] 2.2 Move Pause and Result to the layout, and cancel button presses on a change; verify the 1.1 fixture is unchanged, and by e2e that all buttons work in portrait and a press held through a rotation does nothing
- [x] 2.3 Give `BoardView` a position and scale, and move Match, UI and the debug hint to the layout; verify the 1.1 fixture and all replay e2e pass, and by e2e the portrait positions in both modes, including the half-size rival frame and cells
- [x] 2.4 Pause on rotation; verify by e2e that the state, seed and replay are kept in both directions, the boards are drawn in their new places under Pause, rotating while paused keeps one Pause, rotating during GAME OVER pauses, and a height-only change doesn't pause

## 3. Flow tests and docs

- [x] 3.1 Add e2e for title to result and play again at 375×667, 390×844, 844×390 and 960×540, and change the 700×900 scaling test to portrait; verify the canvas is centered and the largest that fits at each size
- [x] 3.2 Update the README (layouts, adding a position, tests in portrait); verify each statement against the code

## 4. Finish

- [x] 4.1 Run `openspec validate add-responsive-layout --strict`, `npm run check`, and `npm run e2e` twice; all pass
- [x] 4.2 Manual check: run `npm run dev` with the browser's device mode; check every scene at 375×667, 390×844 and 844×390, rotate in each scene and mid-match, resume after rotating, and check that the desktop window looks as before
- [x] 4.3 Bump to 0.1.1 and add the CHANGELOG.md section for SA-26; verify `npm test` passes
