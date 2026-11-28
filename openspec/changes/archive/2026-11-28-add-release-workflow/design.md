# Design

## Context

- Gun Hands already does this in `~/GunHands/.github/workflows/release.yml` with `scripts/release.js` (pure helpers + CLI) and `scripts/package.js`. Its first real run (v0.3.0) installed on Arcade production. This change ports it; the differences come from what Splat Attack already has.
- Splat Attack already has `scripts/release.js` (pure rules: `newestChangelogVersion`, `compareVersions`, `releaseProblems`), `scripts/releaseState.js` (reads git for those rules), `release-check.js` and `release-archive.js` (checks, then `npm run build` and plain `tar -czf`, not repeatable).
- The readiness checks (`releaseProblems`) need a branch, a clean tree and origin's tags. On a tag push in Actions the checkout is a detached HEAD, so the workflow can't reuse them; it needs its own tag check.
- Arcade's `GameInstaller` downloads the URL, checks `hash_file('sha256')` against `config/games.php`, refuses absolute or `..` paths, and needs `index.html` at the archive's top level.
- `vite.config.js` already uses `base: './'`, so the build works from any sub-path, and the build reads the version from `package.json` and the commit from git (`fetch-depth: 0` keeps that working in Actions).

## Goals / Non-Goals

**Goals:**
- Same workflow shape as Gun Hands, so Gilbert runs both projects' releases the same way.
- One packaging function used by the workflow, `npm run package` and `npm run release:archive`.

**Non-Goals:**
- Sharing code between the two repos (a package or a reusable workflow). Two small copies are simpler for now.

## Decisions

1. **Pure helpers go into the existing `scripts/release.js`; the CLI goes into a new `scripts/release-ci.js`.** Added exports: `versionFromTag`, `checkTag`, `changelogSection`, `arcadeBlock`, `withArcadeBlock`, `uploadDecision` (same behavior as Gun Hands'). `release.js` stays import-only (its header says "Pure release rules"), and `release-ci.js` holds the `check | notes | decide | arcade-notes` commands that read files and print `::error::` lines. *Alternative:* a CLI block at the bottom of `release.js` like Gun Hands; rejected so the pure module stays pure and the tests import nothing that touches the filesystem.

2. **`scripts/package.js` exports `packageBuild()` and runs it when called directly.** It runs `vite build`, checks `dist/index.html` exists, and writes the archive with `tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=@<commit time> -cf - -C dist . | gzip -n -9`, then the `.sha256` file. The time comes from `SOURCE_DATE_EPOCH`, else `git log -1 --format=%ct`, else 0. `npm run package` = `node scripts/package.js`. `release-archive.js` keeps its `currentProblems(true)` gate and then calls `packageBuild()`, so the README's local path and the workflow make identical bytes. *Alternative:* keep plain `tar -czf` for `release:archive`; rejected because its hash would never match the workflow's for the same commit.

3. **Tag check uses the CHANGELOG section, not "newest version".** `checkTag(tag, pkgVersion, changelog)` fails when the tag isn't `vX.Y.Z`, when it differs from `package.json` (message names both), or when `changelogSection` finds no `## [X.Y.Z]` heading. `npm test` already enforces newest-section = `package.json`, so the two agree on any green commit.

4. **Publish step = Gun Hands' step, with the archive name changed.** Order: read the release and the attached archive's `digest` (download-and-hash fallback when the API gives none) → `decide` (`upload | skip | conflict`, conflict exits 1 before anything changes) → create the release if missing (`--verify-tag`, `--prerelease` while major is 0, notes from the CHANGELOG) → upload the archive unless `skip`, upload the `.sha256` with `--clobber` (its content is derived from the archive, so it only changes if the archive did) → rewrite the notes with the marker-delimited Install on Arcade block (`<!-- arcade-install:start -->` … `end`), replaced rather than repeated. Also written to the job summary.

5. **Triggers and permissions.** `on: push: tags: ['v[0-9]+.[0-9]+.[0-9]+']` and `workflow_dispatch` (dry run: every publish step is `if: github.event_name == 'push'`). `permissions: contents: write`, per-ref `concurrency` without cancelling, `timeout-minutes: 15`. Steps: checkout (`fetch-depth: 0`), setup-node 24 with npm cache, tag check (push only), `npm ci`, `npm run check`, `npm run package`, upload `release/` as artifact `splat-attack-<version>` (30 days), publish. Actions versions match `ci.yml` (`@v7`).

6. **No e2e or sim in the release job.** CI runs them on the same commit; the README's steps already say wait for green CI on `master` and `release:check` before tagging. Keeps the release job a few minutes long.

7. **Typecheck the new scripts.** Add `scripts/release.js`, `scripts/release-ci.js` and `scripts/package.js` to `jsconfig.json`'s `include` with JSDoc types. Not all of `scripts/` (the sim and recorder aren't typed today and aren't part of this change).

## Risks / Trade-offs

- [Repeatability depends on tool versions: a different `tar`, `gzip` or Vite can change the bytes] → Only the workflow's archive is published and pinned; local archives are for checking. The never-replace rule guards the published one.
- [A bad archive gets published and pinned] → Fix forward with a new patch version. The README explains replacing an asset by hand (delete it, re-run the job) only for a release Arcade doesn't use yet.
- [Every patch tag now makes a public pre-release, so the releases list gets long] → Accepted; that's what lets Arcade install any version. All 0.x releases are pre-releases.
- [Tag pushed before CI finished on master] → `release:check` and the README steps say to wait; the release job still runs unit tests and fails on a broken commit before touching the release.
- [Release job fails after creating the release but before uploading] → Re-running the job is safe: it finds the release, sees no archive, and uploads.

## Migration Plan

1. Merge to `master`, wait for green CI, run a dry run (`gh workflow run release.yml --ref master`), download its artifact and check it.
2. Tag `v0.1.10` (annotated) and push. The workflow creates the pre-release with the archive, checksum and Install on Arcade block.
3. Rollback: delete `.github/workflows/release.yml`; releases go back to `npm run release:archive` + `gh release create`.

Note: v0.1.9 (SA-11) should be tagged before this branch merges. Its commit has no workflow, so pushing that tag doesn't start a release, and v0.1.10 stays the first workflow release.
