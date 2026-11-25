# Tasks

## 1. Match runner and input

- [ ] 1.1 Add the input module and `src/config/input.js`; verify with unit tests for taps between ticks, repeat timing, doubled keys, both directions, OS repeats, charge through settles, and release-all
- [ ] 1.2 Add the tick runner (fixed rate, catch-up cap, manual mode, recording); verify with unit tests at 30, 60 and 144 fps, a long stall, and a recording that replays to the same hash

## 2. Board model

- [ ] 2.1 Add `src/core/landing.js`; verify with fixtures for uneven columns, both vertical orders and hidden landings
- [ ] 2.2 Add the pair's drawn position (grounding, easing, downward limit) and `src/config/view.js`; verify with unit tests, including sliding off a ledge and floor kicks
- [ ] 2.3 Add falls, landings, splats and bridges from events; verify it equals the grid at every quiet tick over random matches and stored replays, on deep-frozen states, with animations ending in time
- [ ] 2.4 Add the ESLint rule for `src/view/`; verify a test lints a forbidden import and it fails, and allowed imports pass

## 3. Match scene

- [ ] 3.1 Add `BoardView` (pooled sprites, crop, bridges, ghost, preview) and remove the sample art from Match; verify in the browser in both modes with no console errors
- [ ] 3.2 Connect the runner, keyboard, seed, pause and focus loss in `MatchScene`; verify in the browser that all keys act and the page doesn't scroll
- [ ] 3.3 Add e2e helpers for direct ticks, and tests for every key, held repeat, preview, ghost, top edge, paused keys, focus loss, top-out and an empty rival board; verify `npm run e2e` passes twice in a row
- [ ] 3.4 Add the e2e test that plays stored replays through Match; verify hashes and drawn cells match, and that a deliberate state change in the view fails it
- [ ] 3.5 Update `npm run record` to play some pairs, and the README (controls, layout, tick control); verify a video is saved and shows play

## 4. Finish

- [ ] 4.1 Run `openspec validate add-board-view --strict`, `npm run check` and `npm run e2e`; all pass, and `git diff master -- tests/core/replays src/config/rules.js` is empty
- [ ] 4.2 Manual check: run `npm run dev` and play Endless to a top-out; check fall smoothness, held moves, rotation at walls, ghost, preview, bridges, a chain, and pause with a key held; then open Ladder
- [ ] 4.3 Bump to 0.0.5 and add the CHANGELOG.md section for SA-5; verify `npm test` passes
