# Tasks

## 1. Meter in the engine

- [ ] 1.1 Add `RULES.meter` (`max`, `blobFill`, `stainFill`, `refillPairs`), the `meter`, `meterLock` and `armed` state fields, and `meterFill` in a new `src/core/meter.js`. Fill from `splat()` while `meterLock === 0`, count `meterLock` down in `spawn()`, and emit `meter {added, meter}`. Verify with tests: a step-1 four-blob splat adds 16, the same at step 3 adds 48, stain matches add `stainFill` each, the cap holds, and gunk drops and hits add nothing
- [ ] 1.2 Add `INPUT.RINSE` and `INPUT.BOMB`, and `fireMeter()` at the top of `step()`: only with exactly one bit and a full meter on a live board, Rinse refused with nothing pending, and firing sets `meterLock`. Emit `rinse {removed}`. Verify with tests: below max nothing happens, both bits fire nothing, an over board ignores the bits, Rinse clears 10 pending and leaves the other board alone in versus, Rinse mid-chain keeps the chain and its power, no pending keeps a full meter, and Endless Rinse does nothing
- [ ] 1.3 Add `bombArea(state)` and the Bomb (clear, stain with the pivot color, `applyGravity`, `bomb {target, cells, color}` then `settle {falls}`, phase stays `falling`) and arming outside `falling`. Verify with ASCII fixture tests: a mid-stack target, column 0 (2×3), an empty column (bottom row, two rows), whole and cracked gunk cleared, the top visible row with hidden rows untouched, armed during a splat going off on the next pair's first falling tick, an armed Bomb lost on top-out, and the pair never overlapping a cell
- [ ] 1.4 Cover the refill limit and score effects. Verify with tests: no fill for `refillPairs` spawns after firing however many ticks pass, fill resumes after; a Bomb clearing eight blobs leaves the score, power and meter unchanged; Bomb fallout splats as chain step 1 of the next lock and scores normally; and the event-reconstruction test includes meter, Rinse and Bomb events (drawn board and stains equal the engine's every tick)

## 2. Replays and the sparring rival

- [ ] 2.1 Widen inputs to 7 bits in `src/core/replay.js`: format 1 accepts the new bits, versus becomes format 3 (7 + 7) in `packInputs` and `playReplay`, and format 2 throws. Verify with tests: a solo round trip and a versus round trip with Rinse and Bomb on both sides through JSON, the old solo files still playing, format 2 throwing as unknown, and masks over the format 3 max throwing
- [ ] 2.2 Add the sparring rival's meter rules (`RULES.sparring.rinseAt`, `bombRows`), counted against its act cooldown. Verify with tests: Rinse at the threshold, Bomb on a high stack with little pending, nothing when the meter isn't full, same inputs from the same state, and the purity lint passes
- [ ] 2.3 Count rinses and bombs in `scripts/replayResult.js` and update `scripts/replays.js`: regenerate `versus.json` requiring a win, a crack, a clear, a Rinse and a Bomb, or add a separate `meter.json` versus replay if no seed up to 500 has all five. Run `npm run replays` for the rest. Verify that `npm test` passes, the Endless replays' scores are unchanged (only hashes differ), and the stored results show at least one Rinse and one Bomb

## 3. Choice and input

- [ ] 3.1 Add the choice to `MatchInput`: `toggleChoice`/`openChoice`/`closeChoice`/`pick`, a `canOpen` callback, Space in `CONTROLS`, left-hand keys picking Rinse and right-hand keys picking Bomb while it is open, held move keys stopping, `CONTROLS.choiceTicks` auto-close, and `releaseAll()` closing it. Verify with unit tests: Space with the meter not full does nothing; Space then D gives one BOMB bit and no RIGHT; Space then Q gives RINSE and no rotation; a held ← stops on open and picks nothing; soft drop still passes; auto-close after `choiceTicks`; releaseAll closes without a bit
- [ ] 3.2 Wire the choice into `MatchScene`. `canOpen` reads the player's meter, the choice closes when the meter isn't full, gesture output is masked to soft drop and drags are released on open, and pause, blur and rotation close it. Verify with a runner-level unit test that ticks keep advancing at the normal rate with the choice open and the pair locks as usual, and that a match fired by choice replays to the same hash
- [ ] 3.3 Add the meter button and role swap: `TouchButton.setIcon`, the meter button toggling the choice (dim when not full), the ccw and cw buttons becoming Rinse and Bomb with `ui_icon_rinse`/`ui_icon_bomb` (symbols while placeholders, Rinse dim while nothing is pending), and a press held from before the choice not picking. Update `FLOW.touchSymbols` and the hints. Verify with `e2e/touch-buttons.spec.js` cases: tap meter then the right button fires Bomb without rotating in portrait and landscape, a meter tap with the meter not full does nothing, and the buttons show rotation again after the choice closes

## 4. Display and layout

- [ ] 4.1 Add `MeterView` (frame plus cropped fill, full tint, scales to its rectangle) and the layout entries: landscape meters under each board in keyboard and touch and in Ladder and Endless, `pendingRival` shortened and `rivalMeter` in portrait, and `match.choice` in every layout. Verify with the layout overlap tests at every portrait height and both landscape modes (updated object counts), and a unit test that the drawn fill width follows `meter / max`
- [ ] 4.2 Add the choice panel and the Bomb target outline (`BoardView` reads `bombArea`, added to the view lint `readers`), and draw Bomb events in `BoardModel` (cleared cells gone, stains updated, falls within the settle time). Verify with model unit tests (the drawn board equals the engine's after random versus matches with meter use), a lint test that the view still can't import mutators, and the outline matching `bombArea` as the pair moves
- [ ] 4.3 Add debug keys to fill the player's and the rival's meter (clearing `meterLock`, dropping the replay), update `DEBUG.hint`, and add a `bomb` debug board. Verify with unit tests (the Bomb board's intended Bomb clears gunk and blobs and its fallout splats on the lock, the keys drop the replay) and update `e2e/debug.spec.js` for the new board and keys

## 5. Browser tests and docs

- [ ] 5.1 Add e2e coverage: Space then → fires Bomb in a keyboard match and the pair doesn't move; the rival's meter display empties when it fires; the meter display matches the engine after a fill; a view replay test for the meter replay compares both drawn boards; and the board-pool and Ladder counts are updated. Verify `npm run e2e -- --workers=4` passes
- [ ] 5.2 Update the README (meter fill, Rinse, Bomb target and stain, arming, refill limit, score effects, controls for the choice, debug keys and board, replay format 3, the sparring rival's meter rules). Verify each statement against the code
- [ ] 5.3 Run `openspec validate add-splat-meter --strict`, `npm run check` and `npm run e2e -- --workers=4`. All pass
- [ ] 5.4 Manual check: run `npm run dev` (and `-- --host` for the Android phone) and play Ladder and Endless in landscape keyboard, landscape touch and portrait touch. Confirm:
  - Splats fill the meter, chains fill it faster, and it looks different when full
  - Space or the meter button opens the choice while the pair keeps falling, and the panel names the options
  - The 3×3 outline follows the pair; Bomb clears it, stains it in the pivot color, and blobs above fall
  - Fallout groups splat when the next pair locks
  - Rinse empties your pending gunk and is dim with none pending
  - Picking never moves or rotates the pair; the choice closes by itself after about 2 seconds, and on pause and rotation
  - The meter doesn't refill for the next couple of pairs
  - The rival's meter shows, and the sparring rival Rinses and Bombs on its own
  - Endless works the same except Rinse

## 6. Finish

- [ ] 6.1 Bump to 0.1.7 and add the CHANGELOG.md section for SA-9 (noting replay format 3, changed hashes, the regenerated versus replay and unchanged Endless scores). Verify `npm test` passes
