# Design

## Context

`splat()` in `src/core/engine.js` removes each group's blobs, scores the chain step with `splatPoints(groups, chain)` and returns a `splat` event. The view (`boardModel.js`) rebuilds the board from events, and placeholders for `stain_<color>` already exist in the manifest (SA-20). Core code stays pure and integer-only. Any change to the state changes every stored replay hash.

## Goals / Non-Goals

**Goals:** stains that are plain state, so copies, hashes and replays just work; a scoring rule simple enough to explain in one line; events that SA-8 can turn into attack power without new engine work; stains you can read at a glance, even without color vision.

**Non-Goals:** balance, FX and HUD (see the proposal).

## Decisions

- **State:** `state.stains` is a flat `number[]` shaped like `grid`: 0 for clean, or a color from 1 to 5. It's created clean in `createState`. *Alternative:* store stain bits inside grid cells; that would save a field, but every grid reader would have to mask them.
- **Stains belong to the wall, not the blobs.** Gravity never moves them. Blobs sit on top of them and fall past them. The hidden rows are never stained, because hidden blobs never splat.
- **Staining happens per splatted cell, in one pass.** For each cell of each group: if `stains[cell] === color`, it's a stain match and the stain stays; otherwise the stain becomes `color`, whether the cell was clean or another color. The pass reads the stains *before* the step changes them, so two groups in one step can't create a match for each other. (They can't share cells anyway.) This lives in `src/core/stain.js` as `applyStains(stains, groups)`, which returns the matched cells per group. The engine calls it before `splatPoints`.
- **A match keeps the stain.** Painting the same color again doesn't wear the stain off, so a stained area keeps paying while you keep landing that color there. That is the "where you clear matters" idea. *Alternative:* a match uses up the stain (stain, then cash in). That's more of a puzzle, but it punishes the obvious play, and it's harder to read on the board. It's easy to switch in SA-15 if playtests say matches come too easily.
- **Scoring:** `RULES.scoring.stainPoints` (10) is added to a group's base for each stain-match blob:
  - group base = `20 × n + 15 × (n − 4) + 10 × matches`
  - The color and chain multipliers apply after that, as before. A 4-group fully on its own stain scores 120 instead of 80 (+50%) in chain step 1, and 300 instead of 200 in step 2.
  - `splatPoints(groups, chain)` reads `group.matched.length`, which is 0 when absent, so `scripts/greedy.js` and existing callers keep working.
  - With no matches, every score is unchanged, so the SA-4 exact-value tests still pass.
- **Event:** each group in the `splat` event gains `matched: {col, row}[]`, empty when nothing matched. The new stain of every splatted cell is just the group's color, so the view needs nothing more. SA-8 will count `matched` for attack power.
- **Fixtures:** `parseStains(text)` and `renderStains(stains)` use the same letters and bottom alignment as boards. `stateWith(text, pair, stains)` takes an optional stain text. Debug boards gain an optional `stains` field, plus a new `stains` board: a red stain under where the pair lands, so one drop shows a match and a repaint.
- **View:** `BoardModel` keeps its own stain array, seeded from the state and updated on each `splat` event, so stains appear when the splat starts, under the splat animation. `drawStains()` returns the stained visible cells. `BoardView` draws them in a new pool at depth 0.5, between the board fill and the ghost, with `VIEW.stainAlpha` (0.5) applied on top of the placeholder's own dim shade. Stains have no animation, no bridges and no easing.
- **Placeholder:** stain entries get their color's `shape`. `drawFrame` draws stains as a full-cell tile in the shaded color with a small shape mark (about 12 px) in the middle, a little lighter. Blob placeholders are full-size shapes on transparent, so the two can't be confused, and the mark carries the color without hue. `ASSETS.md` adds a note asking the SA-20 art to keep a color cue that works without hue.
- **Replays:** the format is unchanged. Inputs are all a replay needs, and stains follow from them. `canonical()` already hashes every field, so `stains` is covered with no code change. `npm run replays` rewrites the expected values, and the diff shows the score changes. The e2e test that plays through the view also compares the drawn stains to `state.stains`.

## Risks / Trade-offs

- [Stains build up until most of the wall is stained, so matches get common late in Endless] → intended to reward reading the wall; the value is small (half a blob's points) and gets tuned in SA-15 with `npm run sim` data from SA-10.
- [Low-contrast stains may be hard to see on a phone in sunlight] → alpha is config; the manual check covers it on Android.
- [Every stored hash changes] → expected, as with any state field. The CHANGELOG explains why the replay scores moved.
