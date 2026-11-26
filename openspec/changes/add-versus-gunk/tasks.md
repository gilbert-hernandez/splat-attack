# Tasks

## 1. Gunk in the board engine

- [x] 1.1 Add `GUNK`, `CRACKED` and `isColor` to `src/core/grid.js`, make `findGroups` flood colors only, and add `#` and `+` to fixture parsing and rendering in `src/debug/boards.js` and `tests/core/fixtures.js`; verify with tests that connected gunk and gunk-bridged blobs don't splat, that gunk falls under gravity, that gunk boards round-trip, and that a bad letter still names its row
- [x] 1.2 Add `hitGunk` in `src/core/gunk.js` and call it from `splat()`, emitting `gunkHit {cracked, cleared}`; verify with fixtures for crack, clear (blobs above fall and the stain under it doesn't change), one hit per step from two groups, crack in step 1 then clear in step 2, and hidden-row gunk untouched
- [x] 1.3 Add `RULES.attack`, the `power` and `pending` state fields, power per chain step, and gunk with offsetting at chain end, emitting `attack {gunk, cancelled, sent, pending}`; verify with exact gunk for single 4 (0), 7-blob single (1), 2- to 5-chain fours (2, 4, 8, 14), a known chain with and without stain matches, and the "cancel incoming" and "attack through" cases
- [x] 1.4 Add `gunkRng` (seeded by side), `dropped`, and the drop in `resolve()` before spawn (full rows, distinct seeded columns, stack on top, lose overflow, `drop` event, cap `maxDrop`); verify with tests for drop between pairs, 10 gunk = 1 row + 3 distinct columns, the cap leaving the rest pending, same columns on replay, a burying drop topping out, and that the event-reconstruction test now covers gunk, hits and drops
- [x] 1.5 Confirm Endless is unchanged: run the existing engine, splat and stain tests and the stored replays in Node (`npm test`), and check that only hashes differ, not scores; note it for the CHANGELOG

## 2. Versus match and sparring rival

- [x] 2.1 Add `src/core/versus.js` (`createVersus`, `stepVersus`, `forceTopOut`) with delivery after both steps and the win, loss and draw outcome; verify with tests for same pairs on both boards, same-tick attacks offsetting only pre-tick pending, rival top-out = win, same-tick top-out = draw, and no changes after the outcome
- [x] 2.2 Add replay format 2 (packed masks, validation, `playReplay` dispatch, `hashState` on versus); verify with a versus round trip through JSON, invalid format-2 masks (> 1023) throwing, and format-1 files still playing
- [x] 2.3 Move the greedy player to `src/ai/sparring.js`, make it gunk-aware, add `RULES.sparring` pacing and per-pair planning on `state.pairs`, and point `scripts/replays.js` at it with no pacing; verify that the purity lint passes, that the same state gives the same inputs, that pacing holds (one action per `actEvery` ticks, drop only after `dropDelay`), and that against a slower-paced copy of itself it splats, sends gunk and the match ends with an outcome
- [x] 2.4 Extend `npm run replays -- --generate` to make one versus replay (fast sparring against paced sparring, searching seeds until it has a crack, a clear and a win), store it, and check it in the Node replay test; then run `npm run replays` to refresh all expected values; verify `npm test` passes and the existing replays' scores are unchanged

## 3. Ladder match in the browser

- [x] 3.1 Give `MatchRunner` a `ladder` mode that holds a versus match, reads the sparring rival's input, records format 2 and passes both boards' events; verify with runner unit tests (ticks, replay recorded and replayable, `dropReplay`, fast-forward keeps the replay)
- [x] 3.2 Update `MatchScene`, `UIScene`, `MatchStats` and `ResultScene`: live rival view, player-only `touch.lock()`, YOU WIN, YOU LOSE or DRAW over the player's board, `gunkSent` and the outcome in the Ladder result; verify with stats unit tests, and in the dev server that a Ladder match plays to a result in both orientations
- [x] 3.3 Draw gunk in `BoardModel`/`BoardView` (drop from above, crack texture swap, break animation, gunk falls), add the gunk placeholders' crust and crack marks, and update the `ASSETS.md` gunk notes; verify with model unit tests (drawn board equals the engine's after random versus matches, crack visible on the hit tick, cleared gunk gone before the next fall) and a placeholder test (whole, cracked and every blob differ in grayscale)
- [x] 3.4 Add `PendingView` and the layout entries (`pendingPlayer`/`pendingRival` in landscape keyboard and touch, the portrait gunk area, and below the rival board in portrait); verify with icon-split unit tests (0, 1, 7, 10, 28, 40), the layout overlap tests at every portrait height and both landscape modes (updated object counts), and the debug view of both displays in the dev server
- [x] 3.5 Add debug keys `G`, `H` and `W`, make `R` top out the player's board in Ladder, update `DEBUG.hint`, and add the `gunk` debug board; verify with unit tests (the gunk board's intended drop cracks one gunk and clears one, keys drop the replay) and update `e2e/debug.spec.js` for the new board and keys

## 4. Browser tests and docs

- [x] 4.1 Update the Ladder e2e tests: the live rival board (`board.spec.js`, including the board-pool count), the Ladder result from the stored versus replay with WIN and gunk sent (`endless.spec.js`), and the Ladder flow and touch-flow tests; add a view replay test for the versus replay comparing both drawn boards with gunk; verify `npm run e2e -- --workers=4` passes
- [x] 4.2 Update the README (versus rules, attack formula and where it's configured, gunk, pending display, fixture letters, new debug keys and board, replay format 2, the sparring rival as a stand-in); verify each statement against the code
- [x] 4.3 Run `openspec validate add-versus-gunk --strict`, `npm run check` and `npm run e2e -- --workers=4`; all pass
- [x] 4.4 Manual check: run `npm run dev` (and `-- --host` for the Android phone) and play Ladder in landscape keyboard, landscape touch and portrait touch. Confirm the rival board plays on its own; a 2-chain sends gunk that shows in the rival's pending display and then drops on its board; rival gunk shows in your display and drops only after your current pair; a chain while gunk is pending reduces it first; a splat next to gunk cracks it and a second clears it; gunk never matches; you can both win and lose against the sparring rival at a casual pace; YOU WIN or YOU LOSE shows, then the result with WIN or LOSS and gunk sent; pausing and rotating mid-match still work; Endless has no gunk and no pending display
  - _Verified by Gilbert 2026-11-25 on desktop and Android._

## 5. Finish

- [x] 5.1 Bump to 0.1.6 and add the CHANGELOG.md section for SA-8 (noting the new replay format, changed hashes and unchanged Endless scores); verify `npm test` passes
