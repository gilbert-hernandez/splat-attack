# Tasks

## 1. Engine

- [ ] 1.1 Add `state.stains` (clean at start) and `applyStains(stains, groups)` in `src/core/stain.js`; verify with unit tests for clean cells, painting over, matches keeping the stain, several groups in one step, hidden rows never stained, and stains not moving when blobs fall
- [ ] 1.2 Add `scoring.stainPoints` to `src/config/rules.js` and the stain-match term to `splatPoints`; call `applyStains` from `splat()` and add `matched` to each group in the splat event; verify with exact scores for partial and full matches in chain steps 1 and 2, that the existing SA-4 score tests pass unchanged, and that the copied-state and event-reconstruction tests cover stains
- [ ] 1.3 Add `parseStains`, `renderStains` and the optional `stains` argument to `stateWith`, and use them in the tests above; verify round trips and fixture errors (wrong width, unknown letter)

## 2. View

- [ ] 2.1 Track stains in `BoardModel` from the state and `splat` events, and add `drawStains()`; verify with unit tests that stains appear on the splat tick, persist through falls and pauses, and equal `state.stains` after random matches
- [ ] 2.2 Draw stains in `BoardView` in a pool under the ghost with `VIEW.stainAlpha`; give stain placeholders their color's shape mark and update the `ASSETS.md` stain notes; verify with a placeholder unit test (grayscale marks differ, tile differs from blob) and by looking at the board in the dev server

## 3. Debug boards and replays

- [ ] 3.1 Let debug boards carry `stains` and add the `stains` board; verify with the boards test (settled, no groups, spawn free) and a test that its intended drop scores a stain match and paints over another color
- [ ] 3.2 Run `npm run replays` and check that at least one stored replay has a stain match (regenerate with `-- --generate` if none does); extend the view e2e replay test to compare drawn stains; verify `npm test` and `npm run e2e -- --workers=4` pass, and note the score changes in the CHANGELOG

## 4. Docs and checks

- [ ] 4.1 Update the README (the Wall, stain scoring, fixtures with stains, the new debug board); verify each statement against the code
- [ ] 4.2 Run `openspec validate add-wall-stains --strict`, `npm run check` and `npm run e2e -- --workers=4`; all pass
- [ ] 4.3 Manual check: run `npm run dev` (and `-- --host` for a phone); in Endless, splat a group and confirm stains appear under the splat, stay put as blobs fall, read clearly under blobs, and look nothing like blobs; load the `stains` debug board, drop the pair, and confirm the score jumps by the expected amount; check on the Android phone in sunlight-level brightness that stains are visible but low contrast

## 5. Finish

- [ ] 5.1 Bump to 0.1.5 and add the CHANGELOG.md section for SA-7; verify `npm test` passes
