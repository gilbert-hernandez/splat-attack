# Tasks

## 1. Release helpers

- [ ] 1.1 Add `versionFromTag`, `checkTag`, `changelogSection`, `arcadeBlock`, `withArcadeBlock` and `uploadDecision` to `scripts/release.js` as pure exports with JSDoc types (design decision 1). Verify with 1.2
- [ ] 1.2 Extend `tests/release.test.js`: tag parsing (`v0.1.10`, `v1.2`, `demo-test`, empty), version mismatch message names both versions, missing CHANGELOG section, section extraction (middle, last before link references, `[Unreleased]` not matched, `0.1.1` not matching `0.1.10`), Arcade block appended once and replaced without duplicates (CRLF notes too), and the three upload decisions (case-insensitive hash). Verify `npm test` passes
- [ ] 1.3 New `scripts/release-ci.js` with the `check <tag>`, `notes <version> <out>`, `decide <existing|-> <new>` and `arcade-notes <in> <version> <url> <sha256> <out>` commands; errors print `::error::` and exit 1. Add `scripts/release.js`, `scripts/release-ci.js` and `scripts/package.js` to `jsconfig.json`. Verify `npm run typecheck` passes and by hand: `node scripts/release-ci.js check v0.1.9` prints `0.1.9`, `check v9.9.9` fails naming both versions, `decide - abc` prints `upload`, `decide abc def` exits 1

## 2. Packaging

- [ ] 2.1 New `scripts/package.js` exporting `packageBuild()` (design decision 2) and running it when called directly; add `"package": "node scripts/package.js"` to `package.json`. Switch `scripts/release-archive.js` to call `packageBuild()` after its readiness gate. Verify: `npm run package` twice prints the same hash; `tar -tzf release/splat-attack-<version>.tar.gz` shows `./index.html` and `./assets/…` with no wrapping folder; `(cd release && sha256sum -c *.sha256)` passes; `git status` doesn't list `release/`

## 3. Workflow

- [ ] 3.1 New `.github/workflows/release.yml` (design decisions 4 and 5): tag and `workflow_dispatch` triggers, `contents: write`, concurrency, checkout with full history, Node 24, tag check (push only), `npm ci`, `npm run check`, `npm run package` with `version`/`archive`/`sha256` outputs, `release/` uploaded as an artifact, then the publish step (push only) using `release-ci.js` for `decide`, `notes` and `arcade-notes`. Header comment explains both modes. Verify `npx prettier --check .github/workflows/release.yml` passes (prettier parses the YAML); the workflow itself is exercised in 5.3 and 5.4

## 4. Docs

- [ ] 4.1 Rewrite the README "Version" section as the release steps: bump and add the CHANGELOG section on the ticket branch, merge `--ff-only`, push, wait for green CI on `master`, `npm run release:check`, push the annotated tag; the workflow makes the pre-release; copy the Install on Arcade values into Arcade's `config/games.php`; for a milestone title, create or rename the release by hand; `npm run package` for a local archive; how to replace a broken archive by hand only when Arcade doesn't use it yet. Update the `scripts/` line in the folder list. Verify each command named exists in `package.json`

## 5. Checks and manual verification

- [ ] 5.1 Run `openspec validate add-release-workflow --strict`, `npm run check` and `npx playwright test --workers=4`. All pass
- [ ] 5.2 Manual check in the browser: extract `release/splat-attack-<version>.tar.gz` (from `npm run package`) into a sub-folder, serve its parent with `python3 -m http.server 8099`, open `http://localhost:8099/<sub-folder>/index.html`. Confirm:
  - The title shows the `package.json` version with no `-dev`
  - Placeholder art and the layout load (no 404s in the console's Network tab)
  - An Endless match and a Ladder match play
  - Portrait works too (narrow the window or use device mode)
- [ ] 5.3 After merging to `master` and green CI: start a dry run (`gh workflow run release.yml --ref master`), confirm it passes, download the artifact (`gh run download`), `sha256sum -c` it, confirm its hash equals a local `npm run package` on the same commit, and confirm `gh release list` is unchanged
- [ ] 5.4 First real run: push the `v0.1.10` tag. Confirm the pre-release `v0.1.10` has the CHANGELOG notes, the archive, the `.sha256` file and one Install on Arcade block whose `download_url` downloads the archive and whose `sha256` matches. Paste the block into SA-31 for SA-17 (or the Arcade entry) to use

## 6. Finish

- [ ] 6.1 Bump `package.json` to 0.1.10 and add the dated CHANGELOG.md section for SA-31 (release workflow, dry run, repeatable archives, `npm run package`, every tag gets a pre-release with the Install on Arcade block; game unchanged). Verify `npm test` passes
