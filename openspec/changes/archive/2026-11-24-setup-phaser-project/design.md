# Design

## Context

Gun Hands (`~/GunHands`) has a proven setup for the same stack. We reuse its patterns and generic code (manifest validation, placeholders, version label), and leave its gameplay code behind.

## Goals / Non-Goals

**Goals:** later tickets add modules without restructuring; missing art never breaks the game; the version is right from the first commit.

**Non-Goals:** no TypeScript, ECS or state library.

## Decisions

- **Phaser 4.2.1, Vite 8.3.8, Vitest 5.1.0, pinned.** The versions Gun Hands already runs. `base: './'` lets the build run from any path, including Arcade.
- **No physics engine.** Unlike Gun Hands, Arcade Physics is left off: the board rules are a pure engine (SA-3) and physics would be a second source of truth.
- **Folders for later:** `src/core/` and `src/ai/` are created by SA-3 and SA-10, not here.
- **Art in `src/assets/img/`**, detected with `import.meta.glob`, so missing files cause no 404s.
- **Manifest keys drop the `sa_` prefix.** Per-color and per-character entries are generated from lists in the manifest, so renaming a color after SA-18 is one edit plus `ASSETS.md`.
- **SA-18 has no manifest entries:** its concept files aren't loaded by the game.
- **Version:** Vite `define` injects `package.json` version and the short commit; a pure `versionLabel()` formats it. With no commits yet, the label falls back to `v0.0.1-dev`.
- **Changelog test:** the newest `## [x.y.z] - YYYY-MM-DD` heading must equal the `package.json` version. An `[Unreleased]` heading is ignored.
- **Scene flow:** Title → ModeSelect (Ladder, Endless; both open a stub Match) → Match + UI. Esc opens Pause. In dev only, `R` in Match opens Result.

## Risks / Trade-offs

- [SA-18 may change sizes or colors] → placeholders and manifest change together; sync test catches drift.
- [Copied setup drifts from Gun Hands] → accepted; two separate repos are simpler than a shared package.
