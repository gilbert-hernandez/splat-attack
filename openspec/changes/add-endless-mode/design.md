# Design

## Context

Stored replays hash the whole state, so any new field changes them. The runner keeps calling `onTick` after the match is over. `DEBUG.enabled` is false in production builds.

## Goals / Non-Goals

**Goals:** SA-12 can replace the result's numbers and SA-13 the HUD without touching the loop.

**Non-Goals:** final numbers for the ramp.

## Decisions

- **Ramp by pairs, not time.** The state gets `pairs` (pairs spawned); the level is `1 + floor((pairs - 1) / 10)` and the speed `min(maxFallSpeed, fallSpeed + 4 × (level - 1))`, so 8 at the start and 128 (the soft-drop speed) from level 31. A pair takes about 6 s to fall at level 1 and 0.5 s at the cap. *Alternative:* time; chains take time to resolve, so it would punish the play that should pay most. Thinking time per pair is already limited by the fall and the lock budget.
- **Both modes use the ramp.** The engine has no modes yet. Ladder can get its own values in SA-8/SA-12.
- **Stats come from events** (`src/match/stats.js`, pure): longest chain. Score, pairs and time come from the state. Nothing extra to hash, and a replay recomputes them.
- **Ending:** when the state is over, MatchScene counts 90 ticks in `onTick` (so pausing stops it), shows GAME OVER, then starts Result once with a stats object. It runs on ticks, so e2e stays exact. Splats and falls are finished by then.
- **Result keys:** Enter, Space and Esc act only after 500 ms, on a fresh press, so keys mashed or held at the end don't skip the screen. Play again restarts Match in the same mode.
- **HUD:** UIScene reads the match each frame and sets text only when it changes. Text only; the score panel is SA-13. Ladder shows the same.
- **Debug keys** (`src/debug/`, by key position, attached only when `DEBUG.enabled`):

  | Key | Does |
  |---|---|
  | 1–5, twice | Sets the next pair: pivot, then other half |
  | B | Loads the next board in a list (5-chain ready, nearly topped out, mid-game) |
  | P | Freezes or unfreezes the clock |
  | . | Freezes and steps one tick |
  | F | Fast-forward on/off (8×) |
  | R | Forces the end |

  A dim line on screen lists them. Loading a board works in any phase except over: it puts the board in place with a fresh falling pair and clears the current chain. Boards are the text format from the engine tests; the parser moves to `src/debug/boards.js` and the fixtures import it.
- **Edited matches can't verify:** changing the state (pair, board, end) drops the match's replay. Freeze, step and fast-forward keep it.
- **Fast-forward** multiplies the ticks owed and the per-frame cap. Unfreezing drops owed ticks.
- **Forced end:** the state goes to `over` and an `over` event takes the normal path, so the key tests the real ending.
- **Stored replays:** run `npm run replays` on the same inputs. If a replay no longer covers its case (top-out, 3-chain, mid-chain), regenerate with `--generate`.
- **Recording:** the greedy player drives the match for about 40 s at normal speed, then drops straight down to a real top-out, then result, play again and a few pairs. It uses the normal mask path, with no debug edits.
- **Archive:** `release:archive` builds, then writes `splat-attack-<version>.tar.gz` (the format Gun Hands used) and a `.sha256` file to the git-ignored `release/`. It runs `release:check`'s rules first, except that the tag may exist if it points at the current commit. The pre-release itself is made with `gh` after Gilbert's OK.

## Risks / Trade-offs

- [The ramp is too slow or too steep] → values in config; the manual check asks for a full match, and the goal is 2–4 minutes for an average player.
- [A very good player could last far past level 31] → fine for a score game; SA-15 can also shorten the lock budget.
- [Debug code changes the state outside the engine] → only `src/debug/` does it, in dev builds, and it drops the replay.
- [Rules move on every ramp tweak] → no `rulesVersion` until SA-12, so no saved scores are affected.
