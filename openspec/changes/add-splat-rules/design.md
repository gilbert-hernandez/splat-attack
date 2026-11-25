# Design

## Context

`step()` locks a pair, applies gravity, waits `settleTicks` and spawns. SA-3 left that wait as the place for splats. Core code must stay pure (see the lint rules in `code-quality`).

## Goals / Non-Goals

**Goals:** chains that can be stopped, copied and resumed on any tick; scores a server can recompute; events rich enough that the view never has to work out rules.

**Non-Goals:** balance. Values are starting points, tuned from SA-6 on.

## Decisions

- **Tick flow:** `falling` → lock → `settling` → if groups exist, remove and score them → `splatting` for `splatTicks` (24) → gravity → `settling` … When a settle ends with no groups, the chain ends and the next pair spawns or the match ends. The chain count and chain points live in the state.
- **Blobs leave the grid on the tick they splat**, so the state has gaps while `splatting`. The view animates from the event. *Alternative:* keep them until the wait ends; then the state needs marked cells, which every later reader must handle.
- **Hidden rows don't match.** Players can't see those blobs, so an unseen match would look like a bug. They match once they fall into view. *Alternative:* match everywhere; simpler, but splats can appear from nowhere.
- **Matching** is an iterative flood fill over the visible rows (no recursion), scanning left to right, top to bottom, so group order is fixed.
- **Scoring, per chain step, in integers:**
  - Group of *n*: `20 × n + 15 × (n − 4)`
  - Color bonus: `100 + 50 × (colors − 1)` percent
  - Chain step *k*: `100 × k + 25 × k × (k − 1)` percent, so 100, 250, 450, 700, 1000…
  - Step points: `floor(sum of groups × color% × chain% / 10000)`
  - For the same 20 blobs: one splat of 20 gives 640, five colors at once 1,200, a 5-step chain 2,000. A test checks that order for 8, 12, 16 and 20 blobs.
  - It's an arithmetic formula of our own, not a lookup table from another game.
- **Events are returned by `step()`, not stored in the state**, so state stays small and hashes don't depend on presentation. Every call returns an array, empty on most ticks. Events are plain data:
  - `lock` {cells}
  - `settle` {falls: [{col, from, to, color}]}, after a lock or a splat, sent when blobs start to fall
  - `splat` {chain, groups: [{color, cells}], points}; one per chain step
  - `chainEnd` {chain, points}, only if something splatted
  - `over` {score}

  *Alternative:* callbacks; they'd put functions near the state and behave differently in copies.
- **Replay format:** `{format: 1, seed, inputs: [[mask, ticks], …]}`, run-length encoded because inputs repeat. Playback rejects bad formats, seeds, masks outside 0–31 and counts below 1. The recorder ignores ticks after the match is over.
- **State hash:** FNV-1a (32-bit, `Math.imul`) over JSON with sorted keys, as 8 hex digits. It finds mistakes, not cheaters; score verification replays the inputs instead.
- **Stored replays:** three committed files, each with inputs, score, longest chain, final hash and a hash every 600 ticks, so a failure says roughly when it diverged: random play to top-out, greedy play with a chain of 3 or more, and one that ends mid-chain. The greedy player lives in `scripts/` and is only for generating them; it isn't a rival bot.
- **`npm run replays` is separate from tests**, so hashes can't be updated by accident with a test flag. It replays the stored inputs and rewrites expected values; `-- --generate` makes new inputs. A rules change may make the old inputs end early, which is why both exist.
- **Chromium check:** an e2e test imports `replay.js` from the dev server and compares hashes, which is the only proof that browsers and Node agree.

## Risks / Trade-offs

- [Any engine change breaks every stored hash, even a harmless new field] → intended; `npm run replays` refreshes them and the diff shows whether scores moved.
- [A chain of many steps takes several seconds (36 ticks each)] → fine for now; timings are config, tuned with the view in SA-5.
- [Chain points grow fast in Endless] → the visible board bounds a chain at 21 steps and scores stay far below the safe-integer limit; balance is SA-12 and SA-15.
