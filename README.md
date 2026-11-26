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

`createState(seed)` starts a match and `step(state, input)` advances it one tick (60 per second) and returns that tick's events (lock, settle, splat, gunk hit, attack, gunk drop, chain end, over) for rendering; `input` combines the `INPUT` bits. The same seed and inputs always give the same match. Lint fails if `src/core/` or `src/ai/` uses Phaser, randomness, the clock, browser globals or non-integer literals.

**The Wall:** each blob that splats stains its cell with its color (`state.stains`, shaped like the grid; gravity never moves it). A different color paints over a stain. A blob that splats on its own color's stain is a stain match: the stain stays and the step gains `scoring.stainPoints` per match before the color and chain bonuses (`src/config/rules.js`). Each group in a splat event lists its stain-match cells as `matched`.

**Versus** (`src/core/versus.js`): `createVersus(seed)` makes two boards, player and rival, with the same pairs but their own gunk streams. `stepVersus(match, playerInput, rivalInput)` steps both, then delivers what each sent, so neither side moves first. A board that tops out loses; both on the same tick is a draw (`match.outcome`: `win`, `loss` or `draw`, from the player's side). Endless runs one board and never gets gunk.

**Attacks and gunk** (values in `RULES.attack`): each chain step adds attack power, `blobPower` per blob plus `stainPower` per stain match, times the same kind of chain curve as the score. When the chain ends, every `powerPerGunk` power is one gunk and the rest is dropped, so a single four sends nothing and chains of fours send 2, 4, 8 and 14 for 2 to 5 steps. The gunk first cancels the board's own `pending`; the rest goes to the other board. Pending gunk drops after the board's pair and chain finish, before its next pair: at most `maxDrop`, full rows first, then single gunk in different seeded columns, on top of each column. Gunk that doesn't fit is lost, and a drop that fills the spawn cell tops the board out. Gunk never matches. A splat cracks each whole gunk next to it and clears each cracked one, once per chain step, never in the hidden rows; cleared gunk leaves no stain.

**The sparring rival** (`src/ai/sparring.js`) plays the Ladder rival until the CPU rivals arrive. It is a one-ply greedy player, paced by `RULES.sparring`: one move or rotation per `actEvery` ticks, then `dropDelay` ticks in place before it soft-drops. Unpaced, it also makes stored replays.

Engine tests draw boards as text with `tests/core/fixtures.js`: `.` is empty, letters are colors (`r y g b p`), `#` is gunk and `+` cracked gunk, and the falling pair shows in uppercase. Stain layers use the same letters, with `.` for a clean cell: `parseStains` and `renderStains`, or a third argument to `stateWith`.

Replays (`src/core/replay.js`) store a match's seed and inputs: format 1 for one board, format 2 for versus, where each mask holds the player's input in the low 5 bits and the rival's in the next 5 (`packInputs`). The ones in `tests/core/replays/` run in `npm test` and, through the browser tests, in Chromium; any change to the engine's state or results fails them. If the change is intended:

```bash
npm run replays                  # replay the stored inputs and rewrite their expected results
npm run replays -- --generate    # also make new inputs, if a replay no longer covers its case
```

Review the diff: a changed `score` means scores moved.

### Match and view

Controls: A/D or ←/→ move, S or ↓ soft drop, Q/Z and E/X rotate, Esc pauses. Keys, repeat and clock settings are in `src/config/input.js`; drawing settings are in `src/config/view.js`.

On a touch screen, drag sideways to move, tap to rotate clockwise and drag down to soft drop. A drag keeps its axis until the finger lifts, and a lock ends a drop. The first finger down outside the buttons owns the gesture. `src/match/gestures.js` turns touches into the same masks as keys, counting ticks rather than time; thresholds are in `src/config/touch.js`, mostly in CSS pixels.

On-screen buttons rotate either way (on press, once) and pause (on release); the meter button's slot stays empty until SA-9. They work while another finger drags, and a finger that pressed one never makes a gesture. Every button, menus included, follows only the finger that pressed it and ignores cancelled touches (`src/ui/pressRule.js`); only the mouse hovers. The result ignores taps for as long as it ignores keys.

The game is in touch mode or keyboard mode (`src/ui/inputMode.js`). It starts in touch mode where the main pointer is coarse. A touch switches to touch; a mouse press or a game key switches back, unless a finger is down. The match buttons show, and the title's hint changes, with the mode. The touch that shows the buttons can't press one.

`src/match/` turns keys, touches and frame time into engine ticks. `src/view/` draws the state and its events: the models are pure and work out what to draw, counting ticks rather than time, and `BoardView` places sprites. Lint stops `src/view/` from importing anything that changes a match, and stored replays must give the same hashes when played through it.

The level rises every 10 pairs and speeds up falling (`src/core/level.js`, values in `src/config/rules.js`). In Endless a top-out shows GAME OVER; in Ladder either board topping out shows YOU WIN, YOU LOSE or DRAW, and the result adds WIN, LOSS or DRAW and the gunk the player sent (cancelled gunk included). Enter or Space plays again, Esc returns to the title. In Ladder each board shows its pending gunk as icons (`src/view/PendingView.js`): a full drop, a row and single gunk.

### Layouts

A window taller than it is wide gets a portrait game, 360 wide and 640 to 780 tall; any other gets 960×540. `src/layout/` picks the size and changes it when the window does. Rotating during a match pauses it.

Every position is in `src/config/layout.js`, for both orientations. A scene makes its objects once and moves them in a callback passed to `onLayout(scene, place)`, which runs at once and after every change, also while the scene is paused. To add something, put its place in both orientations (`npm test` fails if one lacks it) and set it there.

Space for pending gunk, the meter and touch controls is reserved in the portrait match's `areas`; `match.ladder.pendingPlayer` and `pendingRival` place each board's pending gunk (above each board in landscape; in the gunk area and under the rival board in portrait), and `match.buttons` holds the buttons' tap targets: below the board and top right in portrait, in the outer 120 px of each side in landscape. The layout depends on the mode too: in landscape touch mode, `touch` moves the Ladder boards inward. Unit tests check that nothing overlaps, and that every tap target is at least 48 CSS px on windows of 375×553 or 568×320.

Text sizes are in the layout too (`size` on each text's place). Every player-facing text must be at least 12 CSS px on those two windows (`TEXT` in `src/config/layout.js`): 14 game px in portrait, and 21 in landscape touch mode, where `touch` raises them. Keyboard landscape keeps its sizes. A unit test and `e2e/text.spec.js` check it.

### On a phone

The page behaves like an app. `index.html` turns off scrolling, zooming, pull-to-refresh, text selection, tap highlights and the iOS callout for the whole page, bars included. `src/page.js` cancels what browsers do despite CSS: the long-press menu, selection, double tap and iOS Safari's pinch. Page zoom is off, but the game scales itself to the window and its text has a minimum size.

The game sits inside the safe areas, so notches, home bars and browser bars cover nothing. `#game` is a fixed box inset by `env(safe-area-inset-*)`, and the screen shape comes from that box.

Switching apps, locking the phone or clicking outside the window opens Pause during a match. Coming back leaves it paused until RESUME.

To play the dev build on a phone on the same Wi-Fi, run `npm run dev -- --host` (port 5174) and open the computer's address. Under WSL2, Windows also needs a port proxy from 5174 to the WSL address, which can change after a restart, and a firewall rule allowing it.

### Debug keys

In a match, dev builds only (`src/debug/`, keys in `src/config/display.js`):

| Key        | Does                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `1`–`5` ×2 | Sets the next pair: red, yellow, green, blue, purple; pivot first                                 |
| `B`        | Loads the next prepared board on the player's side: 6-step chain, top-out, stains, gunk, mid-game |
| `P`        | Freezes or unfreezes the clock                                                                    |
| `.`        | Freezes and steps one tick                                                                        |
| `F`        | Fast-forward (8×) on or off                                                                       |
| `G` / `H`  | Sends a row of gunk to the player / the rival (`H` in Ladder only)                                |
| `W`        | Wins a Ladder match: the rival's board tops out                                                   |
| `R`        | Forces the end: the player's board tops out                                                       |

For the 6-step chain, move the pair to the left wall and drop it. On the stains board, drop the pair in place: it scores two stain matches (100 points) and paints over a blue stain. On the gunk board, drop the pair at the left wall: the splat cracks the `#` and clears the `+`. Setting a pair, loading a board, sending gunk or forcing an end drops the match's replay.

### Browser tests and videos

```bash
npx playwright install chromium   # once
npm run e2e                       # browser tests against dev and production builds
npm run record -- [out.webm]      # video of a whole Endless match, about a minute; needs `npm run dev` running
npm run record -- --touch         # the same on an upright phone (390×844), menus and pause by touch
```

`npm run e2e` starts its own servers on ports 5175 and 5176. Each test leaves `test-results/<test>/video.webm`, and `npx playwright show-report` opens the report. Tests read game state through `window.__GAME__` (dev builds only). Wait on state or frames with the helpers in `e2e/support.js`, never on the clock. For gameplay, `startStopped` starts a match on a seed with its clock stopped and `advance` runs an exact number of ticks. For another orientation, set the viewport size; `e2e/responsive.spec.js` has helpers. `e2e/touch.spec.js` sends real touch events through Chromium; `fingers` in `e2e/support.js` presses, drags and lifts several. A page with a touch screen starts in touch mode, but starting a match with `startStopped` switches to keyboard mode, so call `useTouch` after it. `e2e/touch-flow.spec.js` plays the whole loop by touch. `e2e/page.spec.js` and `e2e/safe-area.spec.js` emulate a phone (`isMobile`): pinches, drags and long presses on the bars, and notch insets through Chromium's `Emulation.setSafeAreaInsetsOverride`. Tests block the browser's own focus changes (`ignoreWindowBlur`), since a lost focus pauses; `blurWindow` and `setHidden` in `e2e/support.js` send them on purpose (`e2e/focus.spec.js`). `e2e/landscape.spec.js` fails if anything moves at 960×540 in keyboard mode; if that's intended, run `UPDATE_LANDSCAPE=1 npx playwright test landscape` and review the diff.

GitHub Actions runs check, build and e2e on every push and pull request; a failed run keeps its report and videos for 14 days.

## Layout

```
src/main.js                Phaser.Game config (FIT, pixelArt, no physics)
src/config/                tunables (rules.js: the ones that affect results)
src/core/                  the rules engine: pure, deterministic, no Phaser
src/ai/                    the sparring rival (pure, like the engine)
src/match/                 tick runner, keyboard and touch input, stats
src/ui/                    buttons, how they handle presses, and the input mode
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
