# Design

## Context

Gun Hands (`~/GunHands`) has this tooling working locally and on GitHub Actions. SA-1 already formats with its Prettier settings and injects the version.

## Goals / Non-Goals

**Goals:** one command before every commit; the same commands in CI; browser tests that don't flake.

**Non-Goals:** raising coverage numbers; testing on browsers other than Chromium.

## Decisions

- **Same tool versions as Gun Hands, exact pins** (ESLint 10.15.0, Prettier 3.10.1, TypeScript 7.0.2, Playwright 1.65.1, and so on). Gun Hands lists Playwright as `^1.65.1`; here it's exact.
- **Own ports, and e2e never reuses a running server.** `npm run dev` uses 5174, e2e 5175 and the production-build tests 5176, all strict. Gun Hands uses 5173 with `reuseExistingServer: true`; copying that could run these tests against Gun Hands when its dev server is up.
- **Test state, not time.** Specs wait on scene state through `window.__GAME__` and never assert elapsed wall-clock time, which flaked in Gun Hands (GH-4, GH-6, GH-10).
- **Production build test:** a second Playwright project runs against `vite preview` on 5176 after a build. It checks the hook is missing, `R` does nothing, and the label is the plain version. *Alternative:* search `dist/` for strings; rejected because it doesn't prove behavior.
- **Release check is split:** `scripts/release.js` holds pure `releaseProblems(state)`, unit-tested; `scripts/release-check.js` gathers the git and file state. Problems: dirty tree, not on `master`, version already tagged locally or on origin, version not above the newest tag, changelog mismatch. If origin can't be reached, it fails, since an unseen tag could exist.
- **Changelog parsing moves into `scripts/release.js`** so the SA-1 test and the release check share it.
- **`PLAN.md` and `openspec/` stay out of Prettier.** They're written by hand.
- **Core purity lint waits for SA-3**, when `src/core/` exists.

## Risks / Trade-offs

- [Software WebGL on CI is slow] → one retry on CI, 15-minute limit, as in Gun Hands.
- [Videos use disk] → they're git-ignored, and CI uploads them only on failure, kept 14 days.
- [Focus changes may open Pause once SA-13 adds that] → `ignoreWindowBlur` is used by every spec from now on.
