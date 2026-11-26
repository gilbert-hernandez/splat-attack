# Proposal

## Why

Vikunja: **SA-8**. Target version: **0.1.6**. Splat Attack is a versus game, but today Ladder shows an empty rival board and a match ends only when the player tops out. This makes Ladder a real two-board match: chains and stain matches turn into gunk that lands on the other board, incoming gunk can be cancelled by attacking back, and a match ends in a win, a loss or a draw. The meter (SA-9), the CPU rivals (SA-10, SA-11) and the Ladder run and scoring (SA-12) all build on this.

## What Changes

- **One deterministic match with two boards.** A versus match runs two boards from one seed, tick by tick, with the same rules for both. Both boards get the same pair sequence, so neither side gets luckier pieces. Same seed and inputs give the same match in browsers and Node.
- **Attacks.** Each chain step builds attack power from its blobs and stain matches, multiplied by its chain position. Chains pay the most. When the chain ends, the power becomes whole gunk. All values live in `src/config/rules.js`, and the formula is our own. A single four-blob splat sends nothing.
- **Pending gunk and offsetting.** Gunk sent to a board waits in that board's pending queue. A board's own attack cancels its pending gunk first, and only the rest goes to the other board. Pending gunk drops after the board's current pair and chain have finished, before its next pair spawns. A drop is capped at a configured size, and the rest waits for the next drop. Full rows land first, and the remaining blobs land in seeded random columns.
- **Gunk on the board.** Gunk never matches or joins a group, and it falls like a blob. A splat cracks each whole gunk next to it, and a second splat clears it. Each gunk takes at most one hit per chain step. Cleared gunk leaves no stain, and gunk in the hidden rows is never hit.
- **Win, loss and draw.** A board that tops out loses. If both boards top out on the same tick, it's a draw. When the match ends, both boards stop.
- **A sparring rival until SA-10.** The greedy player that already makes the stored replays moves into `src/ai/`, paced by config so it doesn't drop pieces faster than a person can. It plays the Ladder rival's board through the same per-tick input as a player. SA-10 replaces it with the real rivals.
- **Ladder plays a versus match. Endless stays solo** and never gets gunk. In Ladder, the rival board is live, both boards show their pending gunk, and the result shows **WIN**, **LOSS** or **DRAW** with the player's score. Play again starts a new match against the sparring rival. Moving on to the next rival comes in SA-12.
- **Shown on both layouts and by both inputs.** Gunk and cracked gunk are drawn with their own placeholders and animated from engine events: dropping, cracking and clearing. Pending gunk is shown above each board in landscape, and in the reserved gunk area (player) and beside the half-size rival board in portrait. Touch and keyboard input don't change.
- **Replays, fixtures and debug keys cover versus.** A new replay format records both sides' inputs. Stored replays add a versus match that cracks and clears gunk and ends in a win, checked in Node and Chromium. Board fixtures get letters for gunk and cracked gunk. New debug keys send a row of gunk to either board and force a win, and a new debug board sets up a crack and a clear.

## Non-goals

- No real CPU rivals, no per-match variety and no `npm run sim` (SA-10, SA-11). The sparring rival is a stand-in.
- No points for sent gunk, no win bonus, no laps or run flow, no anti-farming and no `rulesVersion` (SA-12). The score works exactly as it does today.
- No meter, Rinse or Bomb (SA-9).
- No real HUD for pending gunk and no gunk warnings (SA-13). The pending display is a placeholder.
- No gunk FX, shake or callouts (SA-15), and no balance pass. The attack and drop values are a starting point.
- No real gunk art. david delivers it in SA-20 and SA-24, and the placeholders stand in until then.
- No local or online two-player.

## Capabilities

### New Capabilities
- `versus-match`: the two-board match, attack power, pending gunk and offsetting, gunk drops, gunk cracking and clearing, win, loss and draw, and the sparring rival.

### Modified Capabilities
- `splat-rules`: gunk never matches, and the events report gunk drops, cracks, clears and sent attacks.
- `board-view`: gunk is drawn and animated, and the rival board is live.
- `replays`: a versus replay format with both sides' inputs, and a stored versus replay.
- `debug-tools`: debug keys send gunk and force a win, and a prepared board sets up a crack and a clear.
- `endless-mode`: the Ladder result shows the outcome, and the match-ending rules cover a rival topping out.
- `responsive-layout`: pending gunk places for both boards in portrait and landscape.
- `code-quality`: board fixtures can contain gunk and cracked gunk.

## Impact

- New: `src/core/versus.js`, `src/core/gunk.js`, `src/ai/sparring.js` (moved from `scripts/greedy.js`), a pending-gunk view, and their tests.
- Changed: `src/core/engine.js`, `src/core/grid.js`, `src/core/splat.js`, `src/core/replay.js`, `src/config/rules.js`, `src/config/layout.js`, `src/config/display.js`, `src/config/view.js`, `src/match/runner.js`, `src/match/stats.js`, `src/scenes/MatchScene.js`, `src/scenes/UIScene.js`, `src/scenes/ResultScene.js`, `src/view/boardModel.js`, `src/view/BoardView.js`, `src/assets/placeholders.js`, `src/debug/boards.js`, `src/debug/debugKeys.js`, `scripts/replays.js`, `tests/core/fixtures.js`, the stored replays, several Ladder e2e tests, `README.md`, `CHANGELOG.md` and `package.json`.
- Every stored replay hash changes because each board's state gains fields. The scores of the existing Endless replays don't change.
- No new dependencies.
