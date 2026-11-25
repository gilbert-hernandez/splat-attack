# Changelog

All notable changes to Splat Attack. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versioning is [SemVer](https://semver.org/) 0.x. Each Dev ticket bumps the patch, and the last ticket of a milestone bumps the minor (M1 = 0.1.0, M2 = 0.2.0, M3 = 0.3.0). Ticket numbers (SA-n) refer to the Splat Attack project in Vikunja.

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
