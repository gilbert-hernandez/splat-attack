# Tasks

## 1. Splat rules

- [x] 1.1 Add group finding in `src/core/splat.js`; verify with fixtures for sizes 3 to 5+, bends, diagonals, several groups (same and different colors), board edges with no wraparound, and hidden rows
- [x] 1.2 Add scoring and its config; verify with exact values by size, colors and chain step, and the chains-pay-most order for 8, 12, 16 and 20 blobs
- [x] 1.3 Add the splat loop to the engine (`splatting` phase, chain count, score) and adapt the SA-3 tests; verify with fixtures for a 5+ step chain, exact timing, ignored input, chain reset, and top-out avoided by a splat
- [x] 1.4 Return events from `step()`; verify each event's contents, that a viewer rebuilding the board from events matches every tick over random matches, and that changing events doesn't affect the state

## 2. Replays

- [x] 2.1 Add the recorder, playback and state hash in `src/core/replay.js`; verify round trips, invalid replays and hash sensitivity
- [x] 2.2 Add `npm run replays` with its greedy generator and the three stored replays; verify `npm test` checks them and that a deliberately changed rule fails naming the replay and checkpoint
- [x] 2.3 Add the e2e test that plays stored replays in Chromium; verify with `npm run e2e`
- [x] 2.4 Update the README (events, replays, layout); verify the commands in it work as written

## 3. Finish

- [x] 3.1 Run `openspec validate add-splat-rules --strict`, `npm run check` and `npm run e2e`; all pass
- [x] 3.2 Manual check: run `npm run dev`; confirm the title shows the version and both modes open, pause and quit as before, with no console errors
  - _Verified by Gilbert 2026-11-25._
- [x] 3.3 Bump to 0.0.4 and add the CHANGELOG.md section for SA-4; verify `npm test` passes
