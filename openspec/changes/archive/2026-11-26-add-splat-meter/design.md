# Design

## Context

See proposal.md, Why. Current state:

- `src/core/engine.js` steps one board through `falling → settling → splatting → settling → … → spawn`. Pending gunk drops once between the chain ending and the next spawn (`dropped`). Input is a 5-bit mask (`INPUT`).
- `src/core/versus.js` steps both boards, then delivers each side's `attack.sent` to the other's `pending`.
- `src/core/replay.js` stores solo masks as 5 bits (format 1). Versus masks pack 5 + 5 bits (format 2). The four stored replays are `random`, `greedy`, `mid-chain` (solo) and `versus`.
- `src/match/input.js` (`MatchInput`) turns keys into masks. `TouchGestures` turns fingers into masks. `MatchScene` ORs the two. Touch buttons call `keys.turn()`.
- The layout already declares `match.buttons.meter` in both orientations and `areas.meter` (200×16) in portrait. `FLOW.touchSymbols.meter` exists. The manifest declares `ui_meter_frame` (200×16), `ui_meter_fill` (196×12), `ui_icon_rinse` and `ui_icon_bomb` (32×32), and `ui_touch_meter`.
- The view lint allows only a list of read-only core imports (`readers` in `eslint.config.js`).

## Goals / Non-Goals

**Goals:**
- The meter is engine state and engine rules, driven only by input bits, so CPU rivals and replays need nothing special.
- The choice is purely an input-layer concern that never touches the clock.
- Every visible change comes from events or a plain read of state.

**Non-Goals:**
- Final visuals. The bar, panel and target outline are placeholders built from existing keys and simple graphics.
- Tuning. The config numbers are starting points for SA-15.

## Decisions

### 1. Meter state and rules live in a new `src/core/meter.js`

The board state gains three integer fields:

- `meter`: 0 to `RULES.meter.max`
- `meterLock`: pairs still to spawn before the meter can fill again
- `armed`: `true` when a Bomb waits for a falling pair

`meter.js` holds pure helpers:

- `meterFill(groups, chain)`: `(blobFill × blobs + stainFill × matched) × chain`
- `bombArea(state)`: target and cells, read-only and allowed in the view
- `rinse(state)` and `bomb(state)`: mutators the engine calls

The engine's `splat()` adds the fill when `meterLock === 0`. `spawn()` decrements `meterLock`.

Starting config (`RULES.meter`): `max: 100`, `blobFill: 4`, `stainFill: 2`, `refillPairs: 2`. A plain four-blob splat fills 16, so about seven single splats, or one three-step chain of fours (16 + 32 + 48 = 96) plus a little, fill the meter.

*Alternative:* fill from attack power. That would tie the meter to attack tuning and make Endless (which has no attack target) feel odd. Rejected.

### 2. Firing is two input bits handled at the top of `step()`

`INPUT.RINSE = 32` and `INPUT.BOMB = 64`. At the start of `step()`, for a live board, `fireMeter()` runs before phase handling:

- Exactly one bit set and `meter === max`:
  - **Rinse:** if `pending > 0`, set `pending = 0`, empty the meter, and emit `{type: 'rinse', removed}`.
  - **Bomb:** empty the meter and set `meterLock = refillPairs`. If `phase === 'falling'`, go off now. Otherwise set `armed = true`.
- Rinse also sets `meterLock`.
- After that, if `armed` and the board is falling, go off and clear `armed`. This happens on the first falling tick after the spawn, before the pair moves.

Going off means three things. First, `bombArea(state)` picks the cells. Then each visible cell in the area is cleared and stained with `pair.pivot`. Finally `applyGravity` runs. The engine emits `{type: 'bomb', target, cells: [{col, row, was}], color}` and then `{type: 'settle', falls}`. The phase stays `falling`. Because the pair is always above every filled cell in its column and gravity only moves cells down, the pair can't overlap anything.

No group matching runs after a Bomb. Groups it forms are found by `resolve()` after the next lock. That makes them chain step 1 of that pair's chain, which is the specified scoring rule, and it needs no new phase.

*Alternative:* add a `bombing` phase that splats the fallout as its own chain. It is more complex, it makes a Bomb a free chain starter (farmable), and it pauses the pair. Rejected.

*Alternative:* refuse Bomb outside `falling`. A player who picks during a short settle would lose their pick silently. Arming costs one boolean. Chosen.

### 3. Target: the top filled cell in the pivot column

`bombArea` scans the pivot's column from the top visible row down to the first non-empty cell. If it finds none, the target is the bottom row. The area is the target ±1 column and row, clipped to the board and to the visible rows. The player aims by moving the pair, and the ghost already shows that column. While the choice is open, the view draws the outline from the same function, so the preview and the effect can't disagree.

*Alternative:* the lowest point, the tallest column, or free aiming with a cursor. The first two take the decision away from the player. A cursor needs a mode where the pair is frozen, which conflicts with "time never stops". Rejected.

### 4. Stain color: the pivot's color

Every visible cell in the area takes `pair.pivot`. This turns Bomb into a planned paint move (setting up stain matches for that color), which fits the Wall mechanic. Cells keep the color even if they were empty or held gunk.

*Alternative:* each cleared blob stains its own color. That is mostly a no-op for stains and has no clear rule for empty or gunk cells. Rejected.

### 5. The choice lives in `MatchInput`, gated by the scene

`MatchInput` gains these members:

- `choice` state: `open`, `ticks` left, and a `picked` bit
- `openChoice()`, `closeChoice()` and `pick(bit)`
- In `next()`, when open, it removes the move and rotate bits from the mask and adds `picked` once.

Its key handling changes as follows:

- A press of a move or rotate key while the choice is open becomes a pick: left-hand keys pick Rinse and right-hand keys pick Bomb. Held keys stop repeating.
- Space calls `toggleChoice()`.

`MatchScene` handles the parts that need the board:

- It gates opening on `state.meter === max` (the input layer stays state-free, apart from a callback the scene passes in: `canOpen()`).
- It closes the choice when the meter drops below max.
- It masks the gesture output (`touch.next()`) to soft drop only while open, and releases gesture drags on open, so a finger that was dragging doesn't snap the pair when the choice closes.

The choice closes after `CONTROLS.choiceTicks` (120, which is 2 s). `releaseInput()` (pause, blur, rotation) closes it.

The match tick never waits on the choice, because the runner's loop is untouched.

### 6. Touch: the rotate buttons swap roles

`TouchButton` gets `setIcon(key)` so the ccw and cw buttons can switch to `ui_icon_rinse` and `ui_icon_bomb` (symbols `R`/`B` while placeholders). Their `onPress` handler checks `keys.choice.open`. A press that was already down when the choice opened doesn't count, because `PressRule` reports presses, not holds. The meter button uses `onPress` to toggle the choice. It is dim while the meter isn't full and normal when it is. Rinse is shown dim while nothing is pending. This reuses tap targets that already pass the layout tests, so no new touch layout is needed.

### 7. Display

`MeterView` (new, `src/view/`) draws `ui_meter_frame` plus a `ui_meter_fill` cropped to `meter / max` of its width. It takes a rectangle from the layout and scales to it, so the half-size rival meter works too. A full meter gets a configured tint so it differs even as a placeholder. New layout entries:

| Layout | Player meter | Rival meter |
|---|---|---|
| Landscape Ladder, keyboard | `{x: 76, y: 500, width: 200, height: 16}` | `{x: 684, y: 500, …}` |
| Landscape Ladder, touch | shifted with the boards (`x: 148` / `612`) | |
| Landscape Endless | `{x: 380, y: 500, …}` | |
| Portrait Ladder | the existing `areas.meter` | `{x: 244, y: 506, width: 112, height: 6}`, with `pendingRival` shortened to 16 px tall |
| Portrait Endless | `areas.meter` | |

- **Choice panel:** a text panel at `match.choice`, near the top of the player's board. It reads `← RINSE · BOMB →` in keyboard mode and `RINSE · BOMB` in touch mode.
- **Target outline:** `BoardView` draws it with a `Graphics` stroke from `bombArea`. That function is added to the view lint's `readers`.

These numbers are a starting point. Layout tests prove there are no overlaps at every supported size.

### 8. Sparring rival

`sparringInput` checks the meter before planning. With `meter === max`:

- It sends Rinse when `pending >= RULES.sparring.rinseAt` (7).
- Otherwise it sends Bomb when the top filled visible row is within `bombRows` (4) of the top.

A meter action uses the bot's act cooldown, like a move. The rival's existing plan keeps the pair where it is, so Bomb goes off where the pair is when it fires.

### 9. Replays: format 3 for versus

`INPUT_BITS` becomes 7. Format 1 keeps its number with a 7-bit max (old 5-bit masks are a subset). Versus becomes format 3 (7 + 7). Format 2 becomes unknown and throws.

`scripts/replays.js` regenerates `versus.json`, now requiring `rinses > 0 && bombs > 0` as well as the existing win, crack and clear conditions. If no seed up to 500 meets all of them, a separate `meter.json` versus replay is generated with only the meter conditions, and `versus.json` keeps its old conditions. `replayResult` counts rinses and bombs from events.

## Risks / Trade-offs

- **[Replay files break]** Format 2 files stop loading. → There are no players or saved runs yet (the leaderboard is post-demo, and `rulesVersion` arrives in SA-12). The only format 2 file is the stored one, which is regenerated.
- **[Bomb fallout without a splat looks odd]** A group can sit unsplatted until the next lock. → This is in the spec as intended, and it is short (one pair). SA-15 can add a hint effect. Keeping it avoids a farmable free chain.
- **[Keys picking instead of moving surprise players]** → The panel shows which side is which. The choice auto-closes in 2 s, and Space closes it at once.
- **[Rival meter in portrait is tiny]** At 6 px it is a placeholder until the SA-13 HUD. → It is still checked by the overlap tests and the e2e meter check.
- **[A stale choice]** The meter can empty while the choice is open (debug load, or a pause). → The scene closes it whenever the meter isn't full, and the engine refuses a non-full fire anyway.
- **[Refill limit too strict or loose]** → It is a config value, and the SA-15 balance pass owns it.

## Migration Plan

Nothing is deployed yet. Merging the branch regenerates the stored replays (`npm run replays -- --generate` for the versus one). Rollback is reverting the branch, since no data persists between sessions yet.
