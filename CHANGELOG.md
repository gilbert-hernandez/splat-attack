# Changelog

All notable changes to Splat Attack. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versioning is [SemVer](https://semver.org/) 0.x. Each Dev ticket bumps the patch, and the last ticket of a milestone bumps the minor (M1 = 0.1.0, M2 = 0.2.0, M3 = 0.3.0). Ticket numbers (SA-n) refer to the Splat Attack project in Vikunja.

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
