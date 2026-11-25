# Tasks

## 1. Code checks

- [x] 1.1 Add Prettier, ESLint, TypeScript and coverage (exact pins) with configs and scripts; fix what they find; verify each passes
- [x] 1.2 Add `npm run check`; verify it fails on a deliberate format, lint, type and test error, one at a time

## 2. Browser tests

- [x] 2.1 Add Playwright config (strict ports, video per test, no server reuse) and `e2e/support.js`
- [x] 2.2 Add e2e specs for the scene flow, pause, quit, result, scaling, version label and placeholders; verify they pass with Gun Hands' dev server running
- [x] 2.3 Add the production-build project and spec
- [x] 2.4 Run the full suite three times in a row; verify no flakes

## 3. Recording

- [x] 3.1 Add `npm run record`; verify it writes .webm and .mp4, and gives a clear message without the dev server

## 4. Release check

- [x] 4.1 Add `scripts/release.js` with unit tests for every problem, and share its changelog parsing with the SA-1 test
- [x] 4.2 Add `npm run release:check`; verify that it lists problems on this branch

## 5. CI and docs

- [x] 5.1 Add the GitHub Actions workflow (check, build, e2e, artifacts on failure)
- [x] 5.2 Update the README
- [ ] 5.3 Manual check: run `npm run check`, `npm run e2e` and `npm run record`; watch one e2e video and the recording; confirm `npm run dev` works on port 5174
- [ ] 5.4 Push the branch (with Gilbert's OK); verify CI passes
- [x] 5.5 Bump to 0.0.2 and add the CHANGELOG.md section for SA-2
