# Proposal

## Why

Vikunja: **SA-9**. Target version: **0.1.7**. The meter move is one of the game's two signature mechanics, and the versus match from SA-8 is ready for it. Splats fill a paint meter. A full meter lets a board **Rinse** its pending gunk or **Bomb** a 3×3 area and stain it. The touch layout already keeps a slot for the meter button. The CPU rivals (SA-10, SA-11) need the meter in the engine so they can plan with it, and the HUD (SA-13) will draw it.

## What Changes

- **The meter is part of each board's state.** Every chain step adds to it, based on its blobs and stain matches and multiplied by its chain step. The meter is capped at a configured maximum, and anything past that is lost. All values live in `src/config/rules.js`. Both boards follow the same rules, so the rival can use the meter through its per-tick input just as the player does.
- **Two new input bits: Rinse and Bomb.** A board fires the meter by sending one of them with a full meter. Firing empties the meter. Nothing else changes the meter, so a match replays from its seed and inputs as it does today.
  - **Rinse** removes all of the board's pending gunk at once, in any phase of a live board. It is refused while nothing is pending, and the meter stays full.
  - **Bomb** clears the 3×3 area centered on the top filled cell in the falling pair's pivot column, or on the bottom row if that column is empty. Blobs, whole gunk and cracked gunk are all cleared. Every visible cell in the area is stained with the pair's pivot color, and gravity follows at once. The player aims by moving the pair. A Bomb fired while no pair is falling (settling, splatting or a gunk drop) is armed and goes off on the next tick a pair is falling. Hidden rows are never cleared.
- **Limits so the meter can't be farmed or used to stall.** After firing, the meter doesn't fill again until a configured number of pairs has spawned. That limit counts pairs, not time, so waiting doesn't help. Rinse and Bomb neither score nor fill the meter. Cells a Bomb clears are not a splat: they score nothing, add no attack power and make no stain matches. The quick choice never pauses or slows the match.
- **Defined score effects.** Firing the meter adds no points and costs none. Groups that form after a Bomb splat when the next pair locks. They join that pair's chain and score by the normal rules. Rinsed gunk is removed without being sent anywhere and doesn't count as an attack. These rules are covered by tests.
- **The quick choice.** It is part of the input layer, not the engine, and the match keeps running while it is open.
  - **Keyboard:** Space opens it while the meter is full. The left-hand keys (A, ←, Q, Z) pick Rinse, the right-hand keys (D, →, E, X) pick Bomb, and Space closes it.
  - **Touch:** the meter button opens it. The rotate buttons become Rinse (left) and Bomb (right), and tapping the meter button again closes it.
  - **While it is open,** the pair still falls and soft drop still works. Moves and rotations from keys, gestures and buttons are held back, so picking an option never moves or turns the pair. The choice closes by itself after a configured time, and also on pause, on rotation, and when the meter is no longer full. A small panel names the options. While Bomb is available, the 3×3 target is outlined on the board.
- **The meter is shown for both boards** in portrait and landscape. The player's meter uses the reserved portrait meter area and sits under the board in landscape. The rival's meter sits next to the rival's board. The touch meter button shows whether the meter is full. The placeholders use the existing `ui_meter_frame`, `ui_meter_fill`, `ui_icon_rinse` and `ui_icon_bomb` keys.
- **The sparring rival uses the meter** under simple, deterministic rules. It Rinses when enough gunk is pending, and it Bombs when its stack nears the top. SA-10 replaces these rules.
- **Replays, events, debug keys and fixtures cover the meter.**
  - **BREAKING (replay files):** the versus replay format changes from 2 to 3 because each side's input grows to 7 bits. Format 1 (solo) stays and accepts the new bits. The stored versus replay is regenerated, and a stored replay must fire both Rinse and Bomb.
  - New `meter`, `rinse` and `bomb` events let the view redraw everything from events.
  - A new debug key fills the player's or the rival's meter, and a new prepared board sets up a Bomb.

## Non-goals

- No real HUD or meter art. The meter bar and the choice panel are placeholders. SA-13 builds the real HUD, and david's art lands in SA-14.
- No Rinse or Bomb effects, shake or callouts (SA-15), and no sound (SA-16).
- No smart meter use by the CPU rivals (SA-10, SA-11). The sparring rival's rules are a stand-in.
- No points or bonus for using the meter, no `rulesVersion` and no anti-farming beyond the meter's own limits (SA-12).
- No balance pass. The fill and limit values are a starting point.
- No aiming the Bomb apart from the pair, no other meter moves and no stored charges.

## Capabilities

### New Capabilities
- `splat-meter`: meter fill, cap and refill limit; Rinse; Bomb (target, clear, stain, gravity, arming); score effects; the quick choice by keyboard and touch; the meter display; the sparring rival's meter use.

### Modified Capabilities
- `splat-rules`: the events add `meter`, `rinse` and `bomb`, and the reconstruction scenario covers Bomb clears and stains.
- `match-input`: Space opens the meter choice, and while it is open the move and rotate keys pick an option instead of acting.
- `touch-buttons`: the meter button fills its slot, and the rotate buttons become the choice while it is open.
- `replays`: versus format 3 with 7 bits per side, solo masks with the meter bits, and a stored replay that fires Rinse and Bomb.
- `debug-tools`: a key fills a board's meter, and a prepared board sets up a Bomb.
- `versus-match`: the sparring rival may fire the meter.
- `responsive-layout`: meter places for both boards in portrait and landscape, and the choice panel.
- `board-view`: the Bomb target outline, and Bomb clears drawn from events.

## Impact

- New: `src/core/meter.js`, a meter view, the choice panel, and their tests.
- Changed:
  - Engine and rules: `src/core/engine.js`, `src/core/replay.js`, `src/config/rules.js`, `src/config/input.js`
  - Layout and flow config: `src/config/layout.js`, `src/config/flow.js`, `src/config/view.js`
  - Input and match: `src/match/input.js`, `src/match/gestures.js`, `src/match/stats.js`
  - Scenes, views and UI: `src/scenes/MatchScene.js`, `src/view/boardModel.js`, `src/view/BoardView.js`, `src/ui/TouchButton.js`
  - Rival and debug: `src/ai/sparring.js`, `src/debug/boards.js`, `src/debug/debugKeys.js`, `src/config/display.js`
  - Tooling, tests and docs: `eslint.config.js` (view readers), `scripts/replays.js`, `scripts/replayResult.js`, the stored replays, layout tests, e2e tests, `README.md`, `CHANGELOG.md` and `package.json`
- Every stored replay hash changes because each board's state gains meter fields. The Endless replays' inputs and scores don't change. The versus replay is regenerated.
- No new dependencies and no new asset keys.
