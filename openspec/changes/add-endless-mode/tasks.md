# Tasks

## 1. Speed ramp

- [ ] 1.1 Add `pairs`, the level and the ramped speed to the engine, with values in `rules.js`; verify with unit tests for the first level, each boundary, the cap, integer speeds, soft drop never slower than falling, and input not changing the level
- [ ] 1.2 Rewrite stored replays (`npm run replays`, regenerating only those that lost their case); verify `npm test` passes, with a top-out, a 3+ chain and a mid-chain replay still present, and list old and new scores in this file

## 2. Loop

- [ ] 2.1 Add `src/match/stats.js`; verify with unit tests against a 5-chain fixture and that a replay gives the same stats
- [ ] 2.2 Show live score and level in UIScene; verify with e2e that a splat and a level change update them on the same tick
- [ ] 2.3 Add the ending in MatchScene (GAME OVER, hold, Result once); verify with e2e the real top-out, the final board during the hold, pausing in the hold, and Quit in the hold
- [ ] 2.4 Rebuild ResultScene with the stats, Play again and Title; verify with e2e the exact numbers in both modes, every key and button, keys held from the match being ignored, and a clean new match with a new seed

## 3. Debug keys

- [ ] 3.1 Move the board parser to `src/debug/boards.js` and add the boards; verify existing fixtures pass, and unit tests that each board is settled, has no group and leaves the spawn cell free
- [ ] 3.2 Add runner freeze, step, fast-forward and dropping the replay; verify with unit tests, including that freeze and fast-forward keep a replay that matches the hash
- [ ] 3.3 Add the debug keys and the on-screen list; verify with e2e for each key, with Pause open, and that the production test finds none of them working

## 4. Recording and release

- [ ] 4.1 Update `npm run record` for a whole match; verify the video shows play, a level change, a top-out, the result and a second match
- [ ] 4.2 Add `npm run release:archive`; verify its checksum with `sha256sum -c`, that the unpacked archive runs from a sub-path, and that it refuses a dirty tree
- [ ] 4.3 Update the README (loop, debug keys, recording, release); verify each command runs as written

## 5. Finish

- [ ] 5.1 Run `openspec validate add-endless-mode --strict`, `npm run check`, and `npm run e2e` twice; all pass
- [ ] 5.2 Manual check: run `npm run dev` and play Endless to a top-out; check that the speed-up is noticeable and fair, the match length, score and level on screen, GAME OVER, the result's numbers, Play again and Esc; then try each debug key, and end a Ladder match with R
- [ ] 5.3 Record the gameplay video and attach it to SA-6; verify it plays from the ticket
- [ ] 5.4 Bump to 0.1.0 and add the CHANGELOG.md section for SA-6; verify `npm test` passes (after merge and tag, with Gilbert's OK: GitHub pre-release with the archive and checksum)
