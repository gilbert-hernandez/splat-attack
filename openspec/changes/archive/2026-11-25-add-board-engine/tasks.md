# Tasks

## 1. Foundations

- [x] 1.1 Add `src/config/rules.js`; `board.js` takes its columns and rows from it
- [x] 1.2 Add the purity lint rules and a test that lints bad and good snippets
- [x] 1.3 Add the seeded RNG with tests (known values, unbiased range, invalid seeds)
- [x] 1.4 Add the grid and the ASCII fixture helper with tests

## 2. Engine

- [x] 2.1 Add state, pieces and the next queue, with tests (same pieces under different play; color count matches the manifest)
- [x] 2.2 Add moving, falling and soft drop, with fixtures
- [x] 2.3 Add rotation, kicks and the flip, with fixtures for all orientations and both directions, at walls, floor, wells and the ceiling
- [x] 2.4 Add lock budget and settling, with fixtures and a stalling test
- [x] 2.5 Add spawn and top-out, with fixtures
- [x] 2.6 Add determinism tests: random input runs to top-out over many seeds, checking equal states, a JSON copy mid-match, integer-only state, legal positions and no floating blobs

## 3. Finish

- [x] 3.1 Update the README (layout, fixtures); run `npm run check` and `npm run e2e`
- [x] 3.2 Manual check: run `npm run dev`; confirm the title shows the version and both modes open, pause and quit as before, with no console errors
  - _Verified by Gilbert 2026-11-25._
- [x] 3.3 Bump to 0.0.3 and add the CHANGELOG.md section for SA-3
