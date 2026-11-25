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

`dist/` runs from any static web server and any path. The dev server is at http://localhost:5174; dev builds show scene names and have [debug keys](#debug-keys).

### Code checks

```bash
npm run check          # format check, lint, type-check, unit tests; run before committing
npm run format         # rewrite files in the project style (Prettier)
npm run lint           # ESLint
npm run typecheck      # type-check the JSDoc (tsc)
npm run coverage       # unit-test coverage; HTML report in coverage/index.html
```

### Engine

`createState(seed)` starts a match and `step(state, input)` advances it one tick (60 per second) and returns that tick's events (lock, settle, splat, chain end, over) for rendering; `input` combines the `INPUT` bits. The same seed and inputs always give the same match. Lint fails if `src/core/` or `src/ai/` uses Phaser, randomness, the clock, browser globals or non-integer literals.

Engine tests draw boards as text with `tests/core/fixtures.js`: `.` is empty, letters are colors (`r y g b p`), and the falling pair shows in uppercase.

Replays (`src/core/replay.js`) store a match's seed and inputs. The ones in `tests/core/replays/` run in `npm test` and, through the browser tests, in Chromium; any change to the engine's state or results fails them. If the change is intended:

```bash
npm run replays                  # replay the stored inputs and rewrite their expected results
npm run replays -- --generate    # also make new inputs, if a replay no longer covers its case
```

Review the diff: a changed `score` means scores moved.

### Match and view

Controls: A/D or ←/→ move, S or ↓ soft drop, Q/Z and E/X rotate, Esc pauses. Keys, repeat and clock settings are in `src/config/input.js`; drawing settings are in `src/config/view.js`.

On a touch screen, drag sideways to move, tap to rotate clockwise and drag down to soft drop. A drag keeps its axis until the finger lifts, and a lock ends a drop. Only the first finger counts. `src/match/gestures.js` turns touches into the same masks as keys, counting ticks rather than time; thresholds are in `src/config/touch.js`, mostly in CSS pixels.

`src/match/` turns keys, touches and frame time into engine ticks. `src/view/` draws the state and its events: the models are pure and work out what to draw, counting ticks rather than time, and `BoardView` places sprites. Lint stops `src/view/` from importing anything that changes a match, and stored replays must give the same hashes when played through it.

The level rises every 10 pairs and speeds up falling (`src/core/level.js`, values in `src/config/rules.js`). A top-out shows GAME OVER, then the result: Enter or Space plays again, Esc returns to the title.

### Layouts

A window taller than it is wide gets a portrait game, 360 wide and 640 to 780 tall; any other gets 960×540. `src/layout/` picks the size and changes it when the window does. Rotating during a match pauses it.

Every position is in `src/config/layout.js`, for both orientations. A scene makes its objects once and moves them in a callback passed to `onLayout(scene, place)`, which runs at once and after every change, also while the scene is paused. To add something, put its place in both orientations (`npm test` fails if one lacks it) and set it there.

Space for the pause button, pending gunk, meter and touch controls is reserved in the portrait match's `areas`. Unit tests check that nothing overlaps them.

### Debug keys

In a match, dev builds only (`src/debug/`, keys in `src/config/display.js`):

| Key        | Does                                                              |
| ---------- | ----------------------------------------------------------------- |
| `1`–`5` ×2 | Sets the next pair: red, yellow, green, blue, purple; pivot first |
| `B`        | Loads the next prepared board: 6-step chain, top-out, mid-game    |
| `P`        | Freezes or unfreezes the clock                                    |
| `.`        | Freezes and steps one tick                                        |
| `F`        | Fast-forward (8×) on or off                                       |
| `R`        | Forces the end                                                    |

For the 6-step chain, move the pair to the left wall and drop it. Setting a pair, loading a board or forcing the end drops the match's replay.

### Browser tests and videos

```bash
npx playwright install chromium   # once
npm run e2e                       # browser tests against dev and production builds
npm run record -- [out.webm]      # video of a whole Endless match, about a minute; needs `npm run dev` running
```

`npm run e2e` starts its own servers on ports 5175 and 5176. Each test leaves `test-results/<test>/video.webm`, and `npx playwright show-report` opens the report. Tests read game state through `window.__GAME__` (dev builds only). Wait on state or frames with the helpers in `e2e/support.js`, never on the clock. For gameplay, `startStopped` starts a match on a seed with its clock stopped and `advance` runs an exact number of ticks. For another orientation, set the viewport size; `e2e/responsive.spec.js` has helpers. `e2e/touch.spec.js` sends real touch events through Chromium. `e2e/landscape.spec.js` fails if anything moves at 960×540; if that's intended, run `UPDATE_LANDSCAPE=1 npx playwright test landscape` and review the diff.

GitHub Actions runs check, build and e2e on every push and pull request; a failed run keeps its report and videos for 14 days.

## Layout

```
src/main.js                Phaser.Game config (FIT, pixelArt, no physics)
src/config/                tunables (rules.js: the ones that affect results)
src/core/                  the rules engine: pure, deterministic, no Phaser
src/match/                 tick runner, keyboard and touch input, stats
src/debug/                 debug keys and boards (dev builds)
src/layout/                screen size and where everything goes
src/view/                  board models (pure) and drawing
src/assets/manifest.js     every graphic, plus validate()
src/assets/placeholders.js generated stand-ins for missing art
src/assets/img/            david's PNGs go here
src/scenes/                Boot → Preload → Title → ModeSelect → Match (+ UI), Pause, Result
tests/                     unit tests
e2e/                       browser tests
scripts/                   recording, stored replays and release check
ASSETS.md                  the art spec
PLAN.md                    the overall plan
openspec/                  specs and changes
```

## Adding art

Name and size the PNG as listed in [ASSETS.md](ASSETS.md), copy it into `src/assets/img/`, and reload (restart `npm run dev` if it isn't picked up). New assets go in both `manifest.js` and `ASSETS.md`; `npm test` fails if they disagree.

## Version

`package.json` is the only source; the title screen shows it. Each Dev ticket bumps it and adds a dated `CHANGELOG.md` section (`npm test` fails if they differ). After merging to `master`, `npm run release:check` lists anything wrong; when it says ready, push the annotated tag `v<version>`. For a milestone, `npm run release:archive` then writes `release/splat-attack-<version>.tar.gz` and its `.sha256` for the GitHub pre-release.

## Workflow

Tracked in the Vikunja project **Splat Attack** (`SA`). One Dev ticket = one OpenSpec change = one branch: propose → review → apply → archive → tag. Art tickets (SA-18 to SA-25 and SA-30) don't use OpenSpec.

## License

Code is under the [MIT License](LICENSE). Artwork is copyright its artist, david, all rights reserved: see [ART-LICENSE.md](ART-LICENSE.md).
