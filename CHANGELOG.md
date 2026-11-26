# Changelog

All notable changes to Splat Attack. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versioning is [SemVer](https://semver.org/) 0.x. Each Dev ticket bumps the patch, and the last ticket of a milestone bumps the minor (M1 = 0.1.0, M2 = 0.2.0, M3 = 0.3.0). Ticket numbers (SA-n) refer to the Splat Attack project in Vikunja.

## [0.1.6] - 2026-11-25

### Added

- **Versus** (SA-8): Ladder is now a real two-board match against a rival. Both boards get the same pairs from one seed and follow the same rules, and the same seed and inputs give the same match in browsers and Node.
- **Attacks** (SA-8): each chain step builds attack power from its blobs and stain matches, rising with the chain. When the chain ends, the power turns into gunk. A single four sends nothing, and chains of fours send 2, 4, 8 and 14 gunk for 2 to 5 steps. Your gunk cancels incoming gunk first. All values are in `RULES.attack`.
- **Gunk** (SA-8): pending gunk drops after your pair and chain, at most 28 at a time, full rows first and then in seeded columns. It never matches. A splat next to it cracks it, and a second clears it.
- **Win, loss and draw** (SA-8): a board that tops out loses, and if both top out on the same tick it's a draw. Ladder shows YOU WIN, YOU LOSE or DRAW, and the result shows WIN, LOSS or DRAW and the gunk you sent.
- **Sparring rival** (SA-8): a paced one-ply greedy player plays the rival's board until the CPU rivals arrive in SA-10. It also generates the stored replays.
- **Pending gunk display** (SA-8): each board shows its pending gunk above it in landscape. In portrait, yours is in the gunk area and the rival's is under its board. Gunk and cracked gunk have their own placeholders.
- **Debug** (SA-8): `G` and `H` send a row of gunk to you or to the rival, and `W` wins a Ladder match. `B` adds a gunk board. Board fixtures use `#` for gunk and `+` for cracked gunk.

### Changed

- Replays have a second format for versus, holding both sides' inputs. A new stored versus replay ends in a win with 47 cracks and 45 clears. Every stored hash changed because the board state gained gunk fields. The Endless replays' scores are unchanged (5,860, 3,895 and 240).
- `R` now tops out your board, and a Ladder match also ends when the rival tops out.
- `scripts/greedy.js` moved to `src/ai/sparring.js`.

## [0.1.5] - 2026-11-25

### Added

- **The Wall** (SA-7): each blob that splats stains its cell with its color, and a different color paints over a stain. Stains stay in place while blobs fall past them, and a new match starts clean.
- **Stain matches** (SA-7): a blob that splats on a stain of its own color keeps the stain and adds 10 points to its chain step, before the color and chain bonuses. Splat events list each group's stain-match cells for the attacks coming in SA-8.
- **Stains on the board** (SA-7): drawn under the ghost and blobs at low contrast, from the moment a splat starts. Until the SA-20 art arrives, a stain is a dim tile with a small mark of its color's shape, so it reads without hue and never looks like a blob.
- **Stain debug board** (SA-7): `B` now also loads a board where dropping the pair in place scores two stain matches and paints over a blue stain. Board fixtures can take a stain layer.

### Changed

- Scores now include stain matches, so the stored replays were regenerated. Greedy play scores 5,860 (was 5,475) and the mid-chain replay 3,895 (was 3,695); random play has no stain matches and is unchanged at 240. Every stored hash changed because the state gained `stains`.

## [0.1.4] - 2026-11-25

### Added

- **Phone page behavior** (SA-29): the page no longer scrolls, zooms, refreshes, selects text or opens long-press menus, also on the bars around the game.
- **Safe areas** (SA-29): the game fits inside notches, home bars and browser bars, and its shape comes from the space left.
- **Pause on focus loss** (SA-29): switching apps, locking the phone or leaving the window opens Pause during a match; coming back leaves it paused. Moved here from SA-13.
- **Touch recording** (SA-29): `npm run record -- --touch` records an upright phone match, with menus and pause by touch.

### Changed

- Text sizes live in the layout config. In landscape touch mode, text is at least 21 game px (12 CSS px on a 568×320 phone), and the result's buttons sit lower to make room. Keyboard mode is unchanged.
- A real-device check on an Android phone found nothing to tune, so touch settings are unchanged. iPhone is untested.

## [0.1.3] - 2026-11-25

### Added

- **Touch buttons** (SA-28): clockwise, counterclockwise and pause buttons in a match, with a slot kept for the meter (SA-9). They sit below the board in portrait and at the sides in landscape, with tap targets of at least 48 CSS px, and work while another finger drags.
- **Touch and keyboard modes** (SA-28): the game switches by itself. Match buttons and the title's hint follow the mode. In landscape touch mode the Ladder boards move inward; keyboard mode is unchanged.
- **Touch art entries** (SA-28): the SA-30 touch button and four icons in the manifest and `ASSETS.md`, with placeholders and stand-in symbols.

### Fixed

- Menu buttons ignore cancelled touches and other fingers, and never stay highlighted after a tap. The result ignores taps for its first half-second, as it does keys.

## [0.1.2] - 2026-11-25

### Added

- **Touch gestures** (SA-27): drag sideways to move, tap to rotate clockwise, drag down to soft drop. Each drag keeps one axis, and a lock ends a drop. Touch makes the same inputs as keys, so scores and replays are unchanged. On-screen buttons come in SA-28.

## [0.1.1] - 2026-11-25

### Added

- **Responsive layout** (SA-26): windows taller than they are wide get a portrait game, 360 wide and 640 to 780 tall. Every scene takes its positions from a layout config and moves without restarting, and rotating mid-match pauses the match. Landscape is unchanged.
- **Portrait art entries** (SA-26): nine SA-30 files in the manifest and `ASSETS.md`, with placeholders.

## [0.1.0] - 2026-11-25

Milestone M1 Core is complete: Endless plays from the title to a top-out, the result and a new match. All art is still generated placeholders.

### Added

- **Endless mode** (SA-6): falling speeds up every 10 pairs, with live score and level, a game-over message, and a result with score, level, pairs, longest chain and time. Play again or return to the title by button or key.
- **Debug keys** (SA-6), dev builds only: set the next pair, load a board, freeze, step, fast-forward and force the end.
- **Release archive** (SA-6): `npm run release:archive` writes the build archive and its SHA-256.

### Changed

- `npm run record` plays a whole Endless match (SA-6).
- `R` in dev builds ends the match through the game-over message instead of jumping to the result (SA-6).

## [0.0.5] - 2026-11-25

### Added

- **Board view and controls** (SA-5): matches are visible and playable for the first time. Smooth falls, landings, splats and bridges drawn from engine events, a ghost, a preview of the next two pairs, and keyboard control with held-key repeat. Browser tests advance exact ticks, and stored replays are checked through the view.

## [0.0.4] - 2026-11-25

### Added

- **Splat rules** (SA-4): four or more connected blobs of one color splat, gravity chains, and scoring by size, colors and chain step. The engine reports events for rendering. Not visible in the game yet. Match replays with state hashes, and stored replays checked in Node and Chromium (`npm run replays`).

## [0.0.3] - 2026-11-25

### Added

- **Board engine** (SA-3): the deterministic rules engine in `src/core/`, with the board, seeded pairs and next queue, moving, rotating with kicks, soft drop, lock budget, settling and top-out. Not visible in the game yet. Text board fixtures for tests, and lint rules that keep the engine pure.

## [0.0.2] - 2026-11-24

### Added

- **Dev tooling** (SA-2): Prettier, ESLint, JSDoc type-checking and coverage with one `npm run check`; Playwright browser tests against dev and production builds, with videos; `npm run record`; `npm run release:check`; and GitHub Actions CI.

### Changed

- The dev server uses port 5174 (SA-2), so it can't collide with Gun Hands.

## [0.0.1] - 2026-11-24

### Added

- **Project setup** (SA-1): Vite + Phaser 4.2.1 scaffold, the scene flow (Boot, Preload, Title, ModeSelect, Match, UI, Pause, Result), an asset manifest with generated placeholders, the `ASSETS.md` art spec, the version on the title screen, and a test that keeps this file in step with `package.json`.
