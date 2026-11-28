# Proposal: add-release-workflow

## Why

Vikunja: SA-31. Target version: **0.1.10**.

Arcade (the host site) installs a game from a `.tar.gz` download URL and its SHA-256 in `config/games.php`. For Splat Attack that archive is made by hand today: `npm run release:archive` on the tagged commit, then `gh release create --prerelease` with the files, and only milestones get a GitHub release at all. To start publishing Splat Attack to Arcade, every version tag should produce a GitHub release with the archive and checksum on its own, as Gun Hands already does (GH-30). The 0.1.10 tag will be the workflow's first real run, so Arcade gets a download URL and hash right away.

## What Changes

- New GitHub Actions workflow `.github/workflows/release.yml`, started by pushing a `v<major>.<minor>.<patch>` tag:
  - fails before building, changing nothing, if the tag doesn't match `package.json` or `CHANGELOG.md` has no section for that version;
  - runs `npm run check` and a production build;
  - packages the build as `splat-attack-<version>.tar.gz` (the contents of `dist/` at the archive root, the layout Arcade's `game:install` expects) plus `splat-attack-<version>.tar.gz.sha256`;
  - creates the GitHub release if it doesn't exist (a pre-release while the version is 0.x, titled `v<version>`, notes from the CHANGELOG section), or keeps an existing one's title and notes;
  - attaches the archive and checksum, and ends the notes with an "Install on Arcade" block giving the exact `version`, `download_url` and `sha256` for `config/games.php`;
  - never replaces an attached archive with different contents, so a hash Arcade already pins can't break.
- Started by hand on any branch, the same workflow is a dry run: same checks, build and packaging, archive kept as a workflow artifact, no release touched.
- Archives become repeatable: the same commit built with the same tools gives the same bytes (fixed file order, owners and timestamps, no name or time in the gzip header). Today's `release:archive` uses plain `tar -czf`, so its hash changes on every build.
- New `npm run package` builds and packages with no readiness checks (what the workflow runs). `npm run release:archive` keeps its readiness checks and uses the same packaging.
- **Every version tag now gets a GitHub release**, not just milestones. Milestone releases can still get a title like `v0.2.0: M2 Versus` by creating the release by hand before tagging, or renaming it afterward.
- README "Version" section rewritten as the release steps.

## Non-goals

- Adding Splat Attack to Arcade's `config/games.php`, the subdomain, or installing on the server. Those stay in SA-17 (or a separate ticket if Gilbert wants it listed sooner); this ticket only produces the values.
- Updating Arcade or the server automatically from the workflow (needs cross-repo tokens and a server-side trigger).
- Re-running browser tests or the rival sim in the release workflow. CI already runs them on every push, including the tagged commit, and the release steps say to wait for green CI before tagging.
- Backfilling releases for v0.1.1 to v0.1.9. Their commits have no workflow, so pushing those tags never ran it; the first workflow release is v0.1.10.
- Changing the versioning scheme, the CHANGELOG format or `npm run release:check`.

## Capabilities

### New Capabilities

- `release`: how a version tag becomes a GitHub release with an installable, checksummed archive for Arcade; the dry run; local packaging.

### Modified Capabilities

- `versioning`: the "Release archive" requirement now uses the same repeatable packaging as the workflow (same commit, same hash) and names the archive layout.

## Impact

- New: `.github/workflows/release.yml`; `scripts/package.js` (build + repeatable archive + checksum, shared); `scripts/release-ci.js` (small CLI the workflow calls: `check`, `notes`, `decide`, `arcade-notes`).
- Changed: `scripts/release.js` (new pure helpers: tag parsing, tag check, CHANGELOG section, Arcade notes block, upload decision); `scripts/release-archive.js` (uses `scripts/package.js`); `tests/release.test.js`; `package.json` (`package` script, version 0.1.10); `README.md`; `CHANGELOG.md`.
- GitHub: the workflow needs `contents: write` with the built-in `GITHUB_TOKEN`. No new secrets.
- `release/` is already git- and prettier-ignored.
