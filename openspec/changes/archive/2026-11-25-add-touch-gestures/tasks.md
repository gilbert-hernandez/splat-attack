# Tasks

## 1. Gesture logic

- [x] 1.1 Add `src/config/touch.js` and the pure `TouchGestures` with ownership, axis choice and sideways steps; verify with unit tests for slow, fast and reversed drags, the queue limit, the first half step, angles around both axis limits, the minimum step at small scales, and a second finger
- [x] 1.2 Add tap, drop, lock and release; verify with unit tests for taps just inside and outside the time and distance, a drop held, resting and reversed, a lock in each kind of press, cancel with moves queued, and `releaseAll`
- [x] 1.3 Verify by unit test that a `MatchRunner` driven by seeded random gestures (with keys mixed in) to a top-out replays to the same hash, and that locks cause no drop or move in the next pair

## 2. Match

- [x] 2.1 Listen to touch in `MatchScene`, combine it with keys, and signal locks and releases; verify that all existing unit and browser tests pass unedited
- [x] 2.2 Add `e2e/touch.spec.js` with touch events sent through CDP and a stopped clock; verify every gesture at 375×667 and 844×390, a lock during a drop, a second finger, touch cancel, pause and resume with a finger down, a layout change, focus loss, a mouse click doing nothing, a menu press lifted in the match, and a touch match replayed to the same hash

## 3. Docs

- [x] 3.1 Update the README (gestures, config, testing touch); verify each statement against the code

## 4. Finish

- [x] 4.1 Run `openspec validate add-touch-gestures --strict`, `npm run check`, and `npm run e2e` twice; all pass
- [x] 4.2 Manual check: run `npm run dev -- --host` and play Endless on a phone in both orientations; check that the pair stays under the finger, taps always rotate, sloppy drags don't drop, the next pair doesn't drop, and a desktop keyboard match plays as before
- [x] 4.3 Bump to 0.1.2 and add the CHANGELOG.md section for SA-27; verify `npm test` passes
