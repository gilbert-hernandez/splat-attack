# Splat Attack

A single-player, score-chasing falling-pair versus puzzle game. Built with **Phaser 4** and **Vite**, in plain JavaScript (ES modules). Code by Gilbert; art by david.

## Scripts

Needs Node.js 20+ (developed on 24) and a browser with WebGL.

```bash
npm install        # once
npm run dev        # dev server with hot reload
npm test           # unit tests (Vitest)
npm run build      # static production build into dist/
npm run preview    # serve dist/ locally
```

`dist/` runs from any static web server and any path. The dev server is at http://localhost:5174; each scene shows its name, and `R` in a match opens Result (dev only).

### Code checks

```bash
npm run check          # format check, lint, type-check, unit tests; run before committing
npm run format         # rewrite files in the project style (Prettier)
npm run lint           # ESLint
npm run typecheck      # type-check the JSDoc (tsc)
npm run coverage       # unit-test coverage; HTML report in coverage/index.html
```

### Engine

`createState(seed)` starts a match and `step(state, input)` advances it one tick (60 per second); `input` combines the `INPUT` bits. The same seed and inputs always give the same match. Lint fails if `src/core/` or `src/ai/` uses Phaser, randomness, the clock, browser globals or non-integer literals.

Engine tests draw boards as text with `tests/core/fixtures.js`: `.` is empty, letters are colors (`r y g b p`), and the falling pair shows in uppercase.

### Browser tests and videos

```bash
npx playwright install chromium   # once
npm run e2e                       # browser tests against dev and production builds
npm run record -- [out.webm]      # scripted gameplay video; needs `npm run dev` running
```

`npm run e2e` starts its own servers on ports 5175 and 5176. Each test leaves `test-results/<test>/video.webm`, and `npx playwright show-report` opens the report. Tests read game state through `window.__GAME__` (dev builds only). Wait on state or frames with the helpers in `e2e/support.js`, never on the clock.

GitHub Actions runs check, build and e2e on every push and pull request; a failed run keeps its report and videos for 14 days.

## Layout

```
src/main.js                Phaser.Game config (960×540, FIT, pixelArt, no physics)
src/config/                tunables (rules.js: the ones that affect results)
src/core/                  the rules engine: pure, deterministic, no Phaser
src/assets/manifest.js     every graphic, plus validate()
src/assets/placeholders.js generated stand-ins for missing art
src/assets/img/            david's PNGs go here
src/scenes/                Boot → Preload → Title → ModeSelect → Match (+ UI), Pause, Result
tests/                     unit tests
e2e/                       browser tests
scripts/                   recording and release check
ASSETS.md                  the art spec
PLAN.md                    the overall plan
openspec/                  specs and changes
```

## Adding art

Name and size the PNG as listed in [ASSETS.md](ASSETS.md), copy it into `src/assets/img/`, and reload (restart `npm run dev` if it isn't picked up). New assets go in both `manifest.js` and `ASSETS.md`; `npm test` fails if they disagree.

## Version

`package.json` is the only source; the title screen shows it. Each Dev ticket bumps it and adds a dated `CHANGELOG.md` section (`npm test` fails if they differ). After merging to `master`, `npm run release:check` lists anything wrong; when it says ready, push the annotated tag `v<version>`.

## Workflow

Tracked in the Vikunja project **Splat Attack** (`SA`). One Dev ticket = one OpenSpec change = one branch: propose → review → apply → archive → tag. Art tickets (SA-18 to SA-25) don't use OpenSpec.

## License

Code is under the [MIT License](LICENSE). Artwork is copyright its artist, david, all rights reserved: see [ART-LICENSE.md](ART-LICENSE.md).
