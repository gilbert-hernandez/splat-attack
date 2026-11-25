# Tasks

## 1. Scaffold

- [x] 1.1 Create `package.json` (0.0.1, exact pins, dev/build/preview/test), `.gitignore`, `.prettierrc.json`; verify `npm install` gives Phaser 4.2.1
- [x] 1.2 Add `index.html`, `vite.config.js` (relative base, version defines), `src/config/`, `src/main.js`; verify the dev server shows the canvas with no errors

## 2. Assets

- [x] 2.1 Add `src/assets/manifest.js` with `validate()` for SA-19 to SA-25, and tests for valid and invalid entries
- [x] 2.2 Write `ASSETS.md` and the manifest sync test
- [x] 2.3 Add placeholder generation with a distinct shape per blob color, and tests for its pure parts

## 3. Versioning

- [x] 3.1 Add `versionLabel()` with tests, and the version on Title
- [x] 3.2 Add `CHANGELOG.md` and the agreement test; verify it fails on a deliberate mismatch

## 4. Scenes

- [x] 4.1 Add Boot and Preload (progress, load what exists, placeholders, one dev warning)
- [x] 4.2 Add Title, ModeSelect, Match and UI; Match shows placeholder blobs on two boards
- [x] 4.3 Add Pause and Result with the dev-only `R` key

## 5. Docs and verification

- [x] 5.1 Add README, LICENSE and ART-LICENSE.md
- [x] 5.2 Run tests and `npm run build`; verify `npm run preview` behaves like dev without debug keys
- [x] 5.3 Manual check with `npm run dev`: loading → Title with version → each mode → Esc pause and resume → `R` result → Title; resize stays centered and crisp; only the placeholder warning in the console
  - _Verified in browser by Gilbert 2026-11-24 (also covered by an automated Chromium run)._
- [x] 5.4 Confirm `package.json` is 0.0.1 and add its dated CHANGELOG.md section naming SA-1
