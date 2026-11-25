# Proposal

## Why

Vikunja: **SA-1**. Target version: **0.0.1**. `~/SplatAttack` only has git and OpenSpec so far. Every later ticket needs a dev server, the scene structure, a config home, an asset pipeline that doesn't wait on david's art, and versioning that works from the first change.

## What Changes

- Add a Vite + Phaser 4 (exact pin) project with `npm run dev`, `build`, `preview` and `test` (Vitest).
- Game config: 960×540, FIT scaling centered, `pixelArt: true`.
- Scene skeleton: Boot → Preload → Title → ModeSelect → Match (with UI on top), Pause, Result.
- One asset manifest covering Art tickets SA-19 to SA-25, with generated placeholders for missing files.
- `ASSETS.md` art spec, kept in sync with the manifest by a test.
- `src/config/` for tunables.
- Version from `package.json` on the title screen, `CHANGELOG.md`, and a test that they agree.
- README, MIT license for code, `ART-LICENSE.md` for david's art.

## Non-goals

- No gameplay: the board engine starts in SA-3.
- No lint, type-checking, coverage, Playwright or CI (SA-2).
- No real art, no deployment.

## Capabilities

### New Capabilities
- `project-setup`: running and building the game, display scaling, scene flow skeleton, config home.
- `assets`: the manifest, loading by key, and placeholders.
- `versioning`: the single version source, title label, and changelog agreement.

### Modified Capabilities
_None (first change)._

## Impact

- New: `package.json`, `vite.config.js`, `index.html`, `src/**`, `tests/**`, `ASSETS.md`, `CHANGELOG.md`, `README.md`, `LICENSE`, `ART-LICENSE.md`.
- Dependencies: `phaser` (runtime), `vite` and `vitest` (dev), all exact pins.
