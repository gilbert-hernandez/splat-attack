# Proposal

## Why

Vikunja: **SA-2**. Target version: **0.0.2**. The rules engine starts in SA-3, and its mistakes are cheapest to catch with checks already running. Gun Hands' tooling works well, so this brings it over and adds a release check, since every Splat Attack ticket ships a version.

## What Changes

- Prettier, ESLint, JSDoc type-checking and Vitest coverage, with one `npm run check`.
- Playwright `npm run e2e`: a video per test, with specs covering the SA-1 scene flow, scaling, pause and version label. A shared `ignoreWindowBlur` helper.
- `npm run record`: a scripted gameplay video (.webm, plus .mp4 when ffmpeg is installed).
- `npm run release:check`: says whether the current commit is ready to tag.
- A test that production builds contain no `window.__GAME__` or debug shortcuts.
- GitHub Actions runs check, build and e2e on every push and pull request.

## Non-goals

- No gameplay, and no engine tooling: ASCII fixtures (SA-3), replays (SA-4), `npm run sim` (SA-10) and `npm run verify` (SA-12) come with the code they test.
- No automatic tagging, releasing or deploying, and no coverage threshold.
- No TypeScript conversion.

## Capabilities

### New Capabilities
- `code-quality`: formatting, linting, type-checking, coverage, the combined check and CI.
- `browser-testing`: browser tests with videos, gameplay recording, and dev-only test hooks.

### Modified Capabilities
- `versioning`: adds the release check.

## Impact

- New: `eslint.config.js`, `jsconfig.json`, `.prettierignore`, `playwright.config.js`, `e2e/**`, `scripts/**`, `.github/workflows/ci.yml`, `tests/release.test.js`.
- Changed: `package.json`, `vite.config.js` (coverage), README, CHANGELOG.
- New dev dependencies, all exact pins. Nothing new ships in the game.
