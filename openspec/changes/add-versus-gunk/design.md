# Design

## Context

The engine (`src/core/engine.js`) runs one board: `createState(seed)` and `step(state, input)` work on plain JSON with integers only, and they return events for the view. `MatchRunner` turns frame time into ticks and records a format-1 replay (`[mask, ticks]` runs). Ladder already lays out a rival `BoardView` but never feeds it a state. `scripts/greedy.js` is a one-ply greedy player used only to generate stored replays. The manifest already has `gunk_whole`, `gunk_cracked`, `gunk_break` and `ui_gunk_small/medium/large`, and portrait reserves `match.areas.gunk`. Lint lets `src/core` and `src/ai` import only core, ai and `config/rules.js`.

## Goals / Non-Goals

**Goals:**
- Keep the single-board engine the unit of rules, so Endless, fixtures and existing tests stay as they are, and build versus as a thin layer over two boards.
- Keep every versus result reproducible from one seed plus two input streams.

**Non-Goals:**
- No bot interface beyond what the sparring rival needs. SA-10 designs the real one.
- No generalization to more than two boards.

## Decisions

### Board state gains gunk fields; versus wraps two boards
Each board's state gains `pending` (gunk waiting), `power` (attack power in the current chain), `gunkRng` (its own stream for drop columns) and `dropped` (true between a gunk drop and the next spawn). `createState(seed, side = 0)` seeds `rng` from `seed` for both sides, which gives the same pairs, and seeds `gunkRng` from `seed` mixed with a per-side constant.

`src/core/versus.js` adds `createVersus(seed)` → `{ tick, outcome, boards: [player, rival] }`, where `outcome` is `null`, `'win'`, `'loss'` or `'draw'` from the player's side. `stepVersus(match, playerInput, rivalInput)` returns `[playerEvents, rivalEvents]`. Each tick steps both boards first. Each board offsets its own `pending` inside its own step. Then the versus layer adds each board's sent gunk to the other board's `pending`, and finally checks for top-outs. Because delivery happens after both steps, neither board sees the other's gunk from the same tick, so neither side gets to move first.

*Alternative:* one engine state holding two grids. Rejected because it would rewrite every rule and fixture for a second index and make Endless pay for versus.

### Gunk is two cell values in the grid
`GUNK = RULES.colors + 1` and `CRACKED = RULES.colors + 2`, with `isColor(value)` in `grid.js`. Gunk lives in the grid, so `applyGravity` moves it like a blob and the hash covers it for free. `findGroups` floods only colors. Fixture letters: `#` for whole and `+` for cracked. These can't clash with the color letters or with the uppercase pair.

### Hits happen in the splat tick
In `splat()`, after the groups leave the grid, `hitGunk(grid, groups)` (`src/core/gunk.js`) collects the visible gunk orthogonally next to any splatted cell, with no duplicates. Whole gunk becomes cracked and cracked gunk becomes empty. Cleared cells fall at the same settle as the splat's gaps. A set per step gives "one hit per step". Stains aren't touched. The `gunkHit` event `{cracked, cleared}` is pushed after the `splat` event.

### Attack formula (starting values, tuned in SA-15)
`RULES.attack = { blobPower: 10, stainPower: 10, chainPercent: 100, chainGrowth: 25, powerPerGunk: 70, maxDrop: 28 }`.

For chain step k, `power += floor((blobPower × blobs + stainPower × matches) × (chainPercent × k + chainGrowth × k × (k − 1)) / 100)`. This follows the score's chain curve (×1, ×2.5, ×4.5, ×7, ×10) with separate config. At `chainEnd`, `gunk = floor(power / powerPerGunk)`, the remainder is dropped, and `power` resets to 0. Examples with fours and no stains: single 0, 2-chain 2, 3-chain 4, 4-chain 8, 5-chain 14. A 7-blob single sends 1. The tests pin these numbers.

Offsetting: `cancelled = min(gunk, pending)`, then `pending -= cancelled`, and `sent = gunk − cancelled`. The `attack` event `{gunk, cancelled, sent, pending}` is pushed only when `gunk > 0`. Endless boards compute and send it too, but nothing receives it.

### Drop point: inside `resolve()`, just before spawn
When a chain has ended (or the pair splatted nothing), if `pending > 0` and not `dropped`, the board drops `min(pending, maxDrop)`. `floor(n / 7)` full rows go in every column. For the remainder, a partial Fisher–Yates on `gunkRng` picks distinct columns. Each gunk is placed on top of its column's stack. Anything that would go above row 0 is lost. Then the board emits a `drop` event `{cells: [{col, row}]}`, sets `dropped = true`, and settles. The next `resolve()` finds no groups, because gunk can't match and the blobs didn't move, so it spawns, applies the top-out rule and clears `dropped`. This reuses the settle timing and the existing top-out check, so a burying drop loses exactly like a normal top-out.

### Outcome and stopping
After delivery, if both boards are `over` on this tick the outcome is `'draw'`. If only one is, its owner loses. Once `outcome` is set, `stepVersus` returns empty events and changes nothing.

### Replay format 2
`{ format: 2, seed, inputs: [[mask, ticks]] }`, where `mask = player | rival << 5` (0–1023), with the same run-length encoding and validation. `playReplay` dispatches on the format. Format-1 files keep working. Recording both sides keeps verification independent of bot code. SA-12 can decide whether run records store the rival's inputs or re-derive them from the bot.

### Sparring rival in `src/ai/sparring.js`
`planPair`/`greedyInput` move from `scripts/greedy.js`, made gunk-aware: gunk counts as height and not as a color neighbor. The rival replans when `state.pairs` changes. That is cheaper and more exact than comparing queue JSON. Pace lives in `RULES.sparring = { actEvery: 6, dropDelay: 30 }`, because `src/ai` may import only `rules.js`. It makes at most one move or rotation every `actEvery` ticks, then waits `dropDelay` ticks once in place before soft-dropping. Its pace state is `{ plan, pairs, lastAct, inPlaceAt }`, kept by the caller next to the match, never in engine state, and computed only from ticks. `scripts/replays.js` imports it with `{ actEvery: 1, dropDelay: 0 }` to make solo replays. The existing stored inputs aren't regenerated, so their scores stay the same.

The stored versus replay is generated as fast sparring (player) against paced sparring (rival), searching seeds until a match has at least one crack, one clear and a player win.

### Runner and scenes
`MatchRunner` takes `mode`. For `'ladder'` it holds a versus match plus a `readRivalInput(match)` callback (the sparring rival), records format 2, and calls `onTick(match, [playerEvents, rivalEvents])`. Endless stays as it is. `MatchScene` feeds `boards[0]` to the player view and `boards[1]` to the rival view. It calls `touch.lock()` only on the player's lock, and shows the end message from `outcome` (YOU WIN, YOU LOSE or DRAW, over the player's board). `MatchStats` adds `gunkSent`, which counts all gunk the player's attacks produced, cancelled gunk included, and `outcome`. `ResultScene` shows them for Ladder only. The UI reads the player's board.

### View
`BoardModel` handles `drop` (new gunk falling from above the top edge to its row, within `settleTicks`), `gunkHit` (cracked gunk changes texture at once, and cleared gunk plays `gunk_break` within `splatTicks` and is removed) and falls of gunk, which reuse blob falls with a gunk texture. Placeholders: whole is the gunk gray with a dried-crust pattern, and cracked is the same tile with a dark crack line. Both must stay distinct from every blob in grayscale, which the placeholder test checks. `PendingView` (`src/view/PendingView.js`) draws up to `VIEW.pendingIcons` (6) icons, greedy from large to small: large = 28 (one full drop), medium = 7 (a row), small = 1. It draws nothing at 0.

### Layout
Landscape (keyboard and touch): `match.ladder.pendingPlayer` and `pendingRival` sit in the strip between the HUD's top and each board's frame (icon row about y 64–88, aligned with the board's x), clear of the centered HUD texts and the corner buttons. Portrait: the player's pending display uses `areas.gunk`. The rival's sits just below the half-size rival board, right of `areas.meter` and above `areas.touch`, because the next boxes fill the space above it. The existing overlap tests get the new entries, and their object counts change.

### Debug keys
`G` adds 7 to the player's `pending`, `H` adds 7 to the rival's (Ladder only), and `W` forces a win by marking the rival's board over and settling the outcome through a core helper (`forceTopOut(match, side)`). `R` now does the same for the player's board in Ladder. All of these drop the replay. New debug board `gunk`: one drop splats next to one `#` and one `+`.

## Risks / Trade-offs

- [Sparring rival too strong or too weak for a fair manual test] → Its pace is config. The manual check confirms a casual player can both win and lose. Balance waits for SA-10 and SA-15.
- [Many Ladder e2e tests assumed an empty rival board or a single state] → The tasks list them: the board-pool count in `board.spec.js`, the debug board count in `debug.spec.js`, the Ladder result test (now played from the stored versus replay) and the flow and touch-flow Ladder tests. Tests that drive the player still use direct tick control, so the rival stays deterministic.
- [Every stored replay hash changes because the state gains fields] → `npm run replays` rewrites them. The Endless scores must stay the same, and the task checks that.
- [Gunk lost above the board hides pressure] → Losing it only happens when the board is nearly full, and then the top-out follows anyway.
- [Drop happens before spawn, which a player might not expect] → This is the genre's usual timing. The pending display warns beforehand. A gunk warning is SA-13.

## Migration Plan

None to roll out: there is no saved data. Old format-1 replays still play. Rollback means reverting the branch.
