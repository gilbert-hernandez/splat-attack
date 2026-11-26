# Proposal

## Why

Vikunja: **SA-7**. Target version: **0.1.5**. The Wall is the game's signature mechanic: where you splat should matter, not just what you splat. Right now a splat leaves nothing behind, so every column is the same and the score only rewards size and chains. This adds stains to the engine and the board so that later work can build on them: the attack formula (SA-8), Bomb (SA-9), bots (SA-10) and the score breakdown (SA-12).

## What Changes

- **Stains are part of the match state.** The board gets a stain layer. Each cell is clean or stained with one color. Stains don't fall with the blobs, and a new match starts clean.
- **Splats stain the wall.** Each blob that splats stains its cell with its own color. If the cell has a different color's stain, the splat paints over it. If the cell already has the same color's stain, the stain stays and the blob scores a **stain match**.
- **Stain matches score.** Each one adds points to its group before the color and chain multipliers, so stain matches and chains build on each other. The value lives in `src/config/rules.js`. Splats with no stain matches score exactly what they do today.
- **Events say what happened.** The splat event lists each group's stain-match cells, so the view (and SA-8's attacks) never has to work out the rules itself.
- **Stains are drawn.** They sit below the ghost and the blobs, at low contrast, with no animation or bridges. They appear the moment a splat starts. The placeholder is a dim tile with a small mark of the color's shape, so a stain is never mistaken for a blob and can be read without relying on hue.
- **Fixtures, debug boards and replays include stains.** Board fixtures can take a stain layer written in the same letters. A new debug board sets up a stain match, and the state hash covers stains. The stored replays are regenerated, and their scores will change wherever a replay splats on a matching stain.

## Non-goals

- No attack power from stains. The match count is in the event, and SA-8 turns it into attacks.
- No Bomb staining (SA-9) and no stains from breaking gunk (SA-8).
- No stain callouts, score popups or splat FX (SA-15), and no HUD or result breakdown of stain points (SA-12, SA-13).
- No `rulesVersion` yet (SA-12). The scoring change is recorded in the CHANGELOG and in the regenerated replays.
- No balance pass. The stain value is a starting point to tune in SA-15.
- No real stain art. david delivers it in SA-20, and the placeholders stand in until then.

## Capabilities

### New Capabilities
- `wall-stains`: the stain layer, staining and painting over, stain matches, and how stains are shown.

### Modified Capabilities
- `splat-rules`: scoring adds stain matches, and the splat event reports them.
- `replays`: the state hash covers stains, and replays played through the view also check the drawn stains.
- `debug-tools`: prepared boards can include stains.
- `assets`: stain placeholders show their color's shape.

## Impact

- New: `src/core/stain.js`, and its tests.
- Changed: `src/core/engine.js`, `src/core/splat.js`, `src/config/rules.js`, `src/config/view.js`, `src/view/boardModel.js`, `src/view/BoardView.js`, `src/assets/placeholders.js`, `src/debug/boards.js`, `tests/core/fixtures.js`, the stored replays, the replay e2e test, `ASSETS.md`, `README.md`, `CHANGELOG.md` and `package.json`.
- Every stored replay hash changes, because the state gains a field.
- No new dependencies.
