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
npm run package    # build and write the release archive into release/ (see Releasing)
npm run sim        # CPU rival strength and variety checks (see below)
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

`createState(seed)` starts a match and `step(state, input)` advances it one tick (60 per second) and returns that tick's events (lock, settle, splat, gunk hit, attack, gunk drop, meter, Rinse, Bomb, chain end, over) for rendering; `input` combines the `INPUT` bits. The same seed and inputs always give the same match. Lint fails if `src/core/` or `src/ai/` uses Phaser, randomness, the clock, browser globals or non-integer literals.

**The Wall:** each blob that splats stains its cell with its color (`state.stains`, shaped like the grid; gravity never moves it). A different color paints over a stain. A blob that splats on its own color's stain is a stain match: the stain stays and the step gains `scoring.stainPoints` per match before the color and chain bonuses (`src/config/rules.js`). Each group in a splat event lists its stain-match cells as `matched`.

**Versus** (`src/core/versus.js`): `createVersus(seed)` makes two boards, player and rival, with the same pairs but their own gunk streams. `stepVersus(match, playerInput, rivalInput)` steps both, then delivers what each sent, so neither side moves first. A board that tops out loses; both on the same tick is a draw (`match.outcome`: `win`, `loss` or `draw`, from the player's side). Endless runs one board and never gets gunk.

**Attacks and gunk** (values in `RULES.attack`): each chain step adds attack power, `blobPower` per blob plus `stainPower` per stain match, times the same kind of chain curve as the score. When the chain ends, every `powerPerGunk` power is one gunk and the rest is dropped, so a single four sends nothing and chains of fours send 2, 4, 8 and 14 for 2 to 5 steps. The gunk first cancels the board's own `pending`; the rest goes to the other board. Pending gunk drops after the board's pair and chain finish, before its next pair: at most `maxDrop`, full rows first, then single gunk in different seeded columns, on top of each column. Gunk that doesn't fit is lost, and a drop that fills the spawn cell tops the board out. Gunk never matches. A splat cracks each whole gunk next to it and clears each cracked one, once per chain step, never in the hidden rows; cleared gunk leaves no stain.

**The meter** (`src/core/meter.js`, values in `RULES.meter`): each chain step fills it by `blobFill` per blob plus `stainFill` per stain match, times the step's chain number, up to `max` (a four fills 16 of 100). A board with a full meter fires it with the `INPUT.RINSE` or `INPUT.BOMB` bit (both at once fire nothing), which empties it; the meter then doesn't fill until `refillPairs` more pairs have spawned, counted in pairs so waiting doesn't help.

- **Rinse** removes all of the board's pending gunk at once, in any phase. It is refused while nothing is pending (so always in Endless), and the meter stays full.
- **Bomb** clears the 3×3 area around the top filled visible cell in the falling pair's pivot column (or that column's bottom row if it's empty): blobs, gunk and cracked gunk. It stains every visible cell there with the pivot's color, and gravity follows at once while the pair keeps falling. Hidden rows are never touched. Fired with no pair falling, the Bomb is armed (`state.armed`) and goes off on the next pair's first falling tick. `bombArea(state)` reads the target without changing anything.
- **Score:** firing adds and costs nothing. A Bomb's cells aren't a splat: no points, power, stain matches or fill. Groups its gravity leaves splat when the next pair locks, as step 1 of that pair's chain.

**CPU rivals** (`src/ai/`, profiles in `src/config/rivals.js`) play the Ladder rival's board. There are five, each with a style: 1 ROOKIE (slow, shallow and error-prone), 2 RUSHER (fast, many small attacks), 3 PAINTER (splats on its stains and Bombs to paint), 4 BUILDER (holds for big chains) and 5 ACE (fast and sharp). Each profile sets its pace, lookahead (pairs planned with, up to the falling pair plus the preview), beam width, work budget, pick weights, the weights its board rating uses, a `fire` threshold that holds back short chains, and its meter use.

- **Fair play.** A rival reads only `seen(board, opponent)` (`src/ai/view.js`): both grids and stains, pending gunk, meters and scores, its own pair and the visible preview. Never the random streams or pairs past the preview. It plays through the same per-tick inputs as a player, paced by `actEvery` and `dropDelay`, and its own random choices come from a stream seeded from its bot seed and its id. In the game the bot seed is the match seed, so matches stay deterministic, a replay needs only the seed and the inputs, and replays (format 3) and their hashes are unchanged. The sim can change the bot seed alone and keep the same pieces.
- **Planning** (`src/ai/planner.js`, `src/ai/evaluate.js`): when a pair spawns, a beam search over its placements and meter moves (Rinse, Bomb at each reachable column) starts. Each tick it does at most `budget` work units: one per simulated placement, plus one per extra chain step, per placement search and per chain-setup probe step. So a rival's work per tick is capped in units, not time. Until the search is done it heads for the best move so far but doesn't drop or fire the meter. When the pair is about to lock, the best move so far is final. When done, it draws which of its best moves to play from `pickWeights`. It always Rinses with a full meter when `rinseAt` gunk is pending, or when the pending gunk would stack its spawn column to the top.
- **Variety** (`src/ai/persona.js`, the `margin`, `vary` and `adapt` fields and `PLANS` in `src/config/rivals.js`): every match a rival draws a persona inside its profile's ranges: a starting plan (build: hold for a big chain; rush: fire early; paint: splat on stains), risk (shifts `fire.at` and the stack penalties), patience (shifts `dropDelay`), one or two preferred colors and a preferred side of the board (a nudge on where its pairs land while the lower half there is open). Each profile makes its signature plan the most likely (the BUILDER builds, the RUSHER rushes, the PAINTER paints), and on its signature plan a rival plays its profile as tuned; the other plans apply their `PLANS` overlay. While its board holds at most `openCells` cells, moves rated within `margin` of the best count as equally good and it draws one, so the strong rivals vary most where it costs least.
- **Adaptation.** Once a pair's search is done, a rival spends its leftover units reading both boards (the longest chain one more blob could set off on each, a work unit per probe step), and plans its next pair with weights shifted by that reading, so reading never delays a move: the player's chain, stains and stack (fire smaller chains sooner, keep low), the player's full meter (attack less, build more), the score gap beyond `gapPoints` (behind: hold out longer; ahead: play safe) and its pending gunk (cancel, fire sooner). How strongly it reacts to each signal is in its profile's `adapt` (the PAINTER and BUILDER ignore threats and keep to their plans). It drops a plan that fails: a build whose chain of 4 or more shrank by two or more without being fired, any build or rush with a column `highStack` tall, or a paint with nothing on a matching stain for `dryPairs` pairs while its board has stains. The new plan is drawn by the profile's weights and kept for `hold` pairs. `window.__GAME__`'s match scene shows `rivalBot.persona` and `rivalBot.plan` in dev builds.
- **Plain rivals.** `createRival(id, seed, {plain: true})` turns variety off: the rival plays move for move as in SA-10 (`tests/ai/baseline.test.js` pins it). The variety run uses it as its baseline.
- **Ladder climb** (`src/match/ladder.js`): Ladder starts at rival 1. A win moves to the next rival, after rival 5 back to rival 1; a loss or draw meets the same rival again. Back to the title starts again at rival 1. The rival's label (`FLOW.rivalLabel`, e.g. RIVAL 3 · PAINTER, or #3 PAINTER in portrait) shows by its board and on the result.

**The sparring rival** (`src/ai/sparring.js`) is the baseline the rivals are measured against. It is a one-ply greedy player, paced by `RULES.sparring`: one move, rotation or meter use per `actEvery` ticks, then `dropDelay` ticks in place before it soft-drops. With a full meter it Rinses once `rinseAt` gunk is pending, or else Bombs when its stack is within `bombRows` of the top. Unpaced, it also makes stored replays.

### Rival simulator

```bash
npm run sim                          # 100 matches per pairing on up to 4 workers
npm run sim -- --quick               # 20 matches per pairing (CI)
npm run sim -- --rivals 3,4 --matches 40 --seed 9 --workers 2
npm run sim -- --variety             # 200 bot seeds per rival, varied and plain (local)
npm run sim -- --variety --quick     # the first 8 pairs only, opening checks only (CI)
```

It pits rival 1 against the sparring rival and each other rival against the one below it, on seeds counting up from `--seed`, alternating boards by seed. Matches run on `node:worker_threads`; results don't depend on the number of workers. A match still going at `SIM.maxTicks` (10 minutes) is cut off. The report gives, per pairing, draws, cut-offs, match length and, per side: win %, longest and average longest chain, average score and its spread, attacks per match and gunk per attack, stain matches per splat, Rinses and Bombs per match, the most work units in one tick, and the p99.9 and worst time per tick. Tick times are only a guide: they depend on the machine and its load. The checks (`scripts/simConfig.js`): rival 1 must win more than half against the sparring rival, and each other rival at least 60% against the one below it (more than half with `--quick`). A failed check exits 1. `tests/ai/styles.test.js` checks that the styles show against sparring. Rivals play with their variety on, as in the game.

`--variety` plays, for each rival, `SIM.variety.matches` (200) matches on one piece seed (`--seed`) against a fixed opponent: the rival below it, plain, or the sparring rival for rival 1. Only the bot seed changes (counting up from 1000). It plays the same matches again with the rival plain as the baseline. Per rival it reports the distinct openings (the share of matches whose first 8 placements, as cells and colors, no other match repeats), the opening overlap (over every pair of matches, the share of the first 8 pairs placed identically), win %, the rival's and the opponent's average score, the opponent's spread and points per minute, varied and plain, plus each starting plan's share and win % and the plan switches per match. Checks: at least 95% distinct openings, overlap below 50%, win % within 10 points of plain, and the opponent's points per minute within 15% and its score's spread at most 125% of plain. Per minute, because a rival that survives longer lets the opponent bank more points at the same rate. `--quick` stops each match after the rival's 8th pair, skips the baseline and checks only the openings.

Engine tests draw boards as text with `tests/core/fixtures.js`: `.` is empty, letters are colors (`r y g b p`), `#` is gunk and `+` cracked gunk, and the falling pair shows in uppercase. Stain layers use the same letters, with `.` for a clean cell: `parseStains` and `renderStains`, or a third argument to `stateWith`.

Replays (`src/core/replay.js`) store a match's seed and inputs, 7 bits a side (meter bits included): format 1 for one board, format 3 for versus, where each mask holds the player's input in the low 7 bits and the rival's in the next 7 (`packInputs`). Format 2, the 5-bit versus format from before the meter, is rejected. The ones in `tests/core/replays/` run in `npm test` and, through the browser tests, in Chromium; any change to the engine's state or results fails them. If the change is intended:

```bash
npm run replays                  # replay the stored inputs and rewrite their expected results
npm run replays -- --generate    # also make new inputs, if a replay no longer covers its case
```

Review the diff: a changed `score` means scores moved.

### Match and view

Controls: A/D or ←/→ move, S or ↓ soft drop, Q/Z and E/X rotate, Space opens the meter choice, Esc pauses.

The meter choice (`src/match/input.js`) opens only with a full meter. While it's open, A, ←, Q and Z pick Rinse and D, →, E and X pick Bomb; Space closes it. The match keeps running: the pair falls and soft drop works, but moves and rotations from keys, gestures and buttons are held back, and keys already down stay spent until pressed again. It closes by itself after `CONTROLS.choiceTicks` (2 s), on pause or rotation, and once the meter isn't full. A panel names the options, Rinse dims with nothing pending, and the Bomb's 3×3 target is outlined on the board. Keys, repeat and clock settings are in `src/config/input.js`; drawing settings are in `src/config/view.js`.

On a touch screen, drag sideways to move, tap to rotate clockwise and drag down to soft drop. A drag keeps its axis until the finger lifts, and a lock ends a drop. The first finger down outside the buttons owns the gesture. `src/match/gestures.js` turns touches into the same masks as keys, counting ticks rather than time; thresholds are in `src/config/touch.js`, mostly in CSS pixels.

On-screen buttons rotate either way (on press, once), open or close the meter choice (dim until the meter is full) and pause (on release). While the choice is open, the rotate buttons become Rinse (left) and Bomb (right). They work while another finger drags, and a finger that pressed one never makes a gesture. Every button, menus included, follows only the finger that pressed it and ignores cancelled touches (`src/ui/pressRule.js`); only the mouse hovers. The result ignores taps for as long as it ignores keys.

The game is in touch mode or keyboard mode (`src/ui/inputMode.js`). It starts in touch mode where the main pointer is coarse. A touch switches to touch; a mouse press or a game key switches back, unless a finger is down. The match buttons show, and the title's hint changes, with the mode. The touch that shows the buttons can't press one.

`src/match/` turns keys, touches and frame time into engine ticks. `src/view/` draws the state and its events: the models are pure and work out what to draw, counting ticks rather than time, and `BoardView` places sprites. Lint stops `src/view/` from importing anything that changes a match, and stored replays must give the same hashes when played through it.

The level rises every 10 pairs and speeds up falling (`src/core/level.js`, values in `src/config/rules.js`). In Endless a top-out shows GAME OVER; in Ladder either board topping out shows YOU WIN, YOU LOSE or DRAW, and the result adds WIN, LOSS or DRAW and the gunk the player sent (cancelled gunk included). Enter or Space plays again, Esc returns to the title. In Ladder each board shows its pending gunk as icons (`src/view/PendingView.js`): a full drop, a row and single gunk. Each board shows its meter (`src/view/MeterView.js`), tinted when full.

### Layouts

A window taller than it is wide gets a portrait game, 360 wide and 640 to 780 tall; any other gets 960×540. `src/layout/` picks the size and changes it when the window does. Rotating during a match pauses it.

Every position is in `src/config/layout.js`, for both orientations. A scene makes its objects once and moves them in a callback passed to `onLayout(scene, place)`, which runs at once and after every change, also while the scene is paused. To add something, put its place in both orientations (`npm test` fails if one lacks it) and set it there.

Space for pending gunk, the meter and touch controls is reserved in the portrait match's `areas`; `match.ladder.pendingPlayer` and `pendingRival` place each board's pending gunk (above each board in landscape; in the gunk area and under the rival board in portrait), `meterPlayer` and `meterRival` the meters (under each board in landscape; in the meter area and under the rival's pending gunk in portrait), `choice` the meter choice's panel, `rivalLabel` the rival's name (a box it's centered in, with its size and `long` or `short` form), and `match.buttons` holds the buttons' tap targets: below the board and top right in portrait, in the outer 120 px of each side in landscape. The layout depends on the mode too: in landscape touch mode, `touch` moves the Ladder boards inward. Unit tests check that nothing overlaps, and that every tap target is at least 48 CSS px on windows of 375×553 or 568×320.

Text sizes are in the layout too (`size` on each text's place). Every player-facing text must be at least 12 CSS px on those two windows (`TEXT` in `src/config/layout.js`): 14 game px in portrait, and 21 in landscape touch mode, where `touch` raises them. Keyboard landscape keeps its sizes. A unit test and `e2e/text.spec.js` check it.

### On a phone

The page behaves like an app. `index.html` turns off scrolling, zooming, pull-to-refresh, text selection, tap highlights and the iOS callout for the whole page, bars included. `src/page.js` cancels what browsers do despite CSS: the long-press menu, selection, double tap and iOS Safari's pinch. Page zoom is off, but the game scales itself to the window and its text has a minimum size.

The game sits inside the safe areas, so notches, home bars and browser bars cover nothing. `#game` is a fixed box inset by `env(safe-area-inset-*)`, and the screen shape comes from that box.

Switching apps, locking the phone or clicking outside the window opens Pause during a match. Coming back leaves it paused until RESUME.

To play the dev build on a phone on the same Wi-Fi, run `npm run dev -- --host` (port 5174) and open the computer's address. Under WSL2, Windows also needs a port proxy from 5174 to the WSL address, which can change after a restart, and a firewall rule allowing it.

### Debug keys

In a match, dev builds only (`src/debug/`, keys in `src/config/display.js`):

| Key        | Does                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `1`–`5` ×2 | Sets the next pair: red, yellow, green, blue, purple; pivot first                                       |
| `B`        | Loads the next prepared board on the player's side: 6-step chain, top-out, stains, gunk, bomb, mid-game |
| `P`        | Freezes or unfreezes the clock                                                                          |
| `.`        | Freezes and steps one tick                                                                              |
| `F`        | Fast-forward (8×) on or off                                                                             |
| `G` / `H`  | Sends a row of gunk to the player / the rival (`H` in Ladder only)                                      |
| `M` / `N`  | Fills the player's / the rival's meter and clears its refill limit (`N` in Ladder only)                 |
| `V`        | Starts a new match against the next Ladder rival, on a new seed (Ladder only)                           |
| `W`        | Wins a Ladder match: the rival's board tops out                                                         |
| `R`        | Forces the end: the player's board tops out                                                             |

For the 6-step chain, move the pair to the left wall and drop it. On the stains board, drop the pair in place: it scores two stain matches (100 points) and paints over a blue stain. On the gunk board, drop the pair at the left wall: the splat cracks the `#` and clears the `+`. On the bomb board, fill the meter and Bomb with the pair in place: it clears gunk and blobs, and the reds that fall splat when the pair locks. Setting a pair, loading a board, sending gunk, filling a meter or forcing an end drops the match's replay.

### Browser tests and videos

```bash
npx playwright install chromium   # once
npm run e2e                       # browser tests against dev and production builds
npm run record -- [out.webm]      # video of a whole Endless match, about a minute; needs `npm run dev` running
npm run record -- --touch         # the same on an upright phone (390×844), menus and pause by touch
```

`npm run e2e` starts its own servers on ports 5175 and 5176. Each test leaves `test-results/<test>/video.webm`, and `npx playwright show-report` opens the report. Tests read game state through `window.__GAME__` (dev builds only). Wait on state or frames with the helpers in `e2e/support.js`, never on the clock. For gameplay, `startStopped` starts a match on a seed with its clock stopped and `advance` runs an exact number of ticks. For another orientation, set the viewport size; `e2e/responsive.spec.js` has helpers. `e2e/touch.spec.js` sends real touch events through Chromium; `fingers` in `e2e/support.js` presses, drags and lifts several. A page with a touch screen starts in touch mode, but starting a match with `startStopped` switches to keyboard mode, so call `useTouch` after it. `e2e/touch-flow.spec.js` plays the whole loop by touch. `e2e/page.spec.js` and `e2e/safe-area.spec.js` emulate a phone (`isMobile`): pinches, drags and long presses on the bars, and notch insets through Chromium's `Emulation.setSafeAreaInsetsOverride`. Tests block the browser's own focus changes (`ignoreWindowBlur`), since a lost focus pauses; `blurWindow` and `setHidden` in `e2e/support.js` send them on purpose (`e2e/focus.spec.js`). `e2e/landscape.spec.js` fails if anything moves at 960×540 in keyboard mode; if that's intended, run `UPDATE_LANDSCAPE=1 npx playwright test landscape` and review the diff.

GitHub Actions runs check, the quick sim, the quick variety run, build and e2e on every push and pull request; a failed run keeps its report and videos for 14 days.

## Layout

```
src/main.js                Phaser.Game config (FIT, pixelArt, no physics)
src/config/                tunables (rules.js: the ones that affect results)
src/core/                  the rules engine: pure, deterministic, no Phaser
src/ai/                    the CPU rivals and the sparring rival (pure, like the engine)
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
scripts/                   recording, stored replays, release check and packaging, and the rival simulator
ASSETS.md                  the art spec
PLAN.md                    the overall plan
openspec/                  specs and changes
```

## Adding art

Name and size the PNG as listed in [ASSETS.md](ASSETS.md), copy it into `src/assets/img/`, and reload (restart `npm run dev` if it isn't picked up). New assets go in both `manifest.js` and `ASSETS.md`; `npm test` fails if they disagree.

## Version

`package.json` is the only source; the title screen shows it. Each Dev ticket bumps it and adds a dated `CHANGELOG.md` section (`npm test` fails if they differ).

## Releasing

Every version tag becomes a GitHub pre-release (while 0.x) carrying the archive Arcade installs: `splat-attack-<version>.tar.gz`, the contents of `dist/` at its root, and its `.sha256`. `.github/workflows/release.yml` does it; the rules are in `scripts/release.js` and the workflow calls them through `scripts/release-ci.js`.

1. On the ticket branch, bump `package.json` and add the dated `CHANGELOG.md` section.
2. Merge to `master` with `--ff-only`, push, and wait for CI on `master` to pass (the release job doesn't rerun the browser tests or the sim).
3. `npm run release:check`. When it says ready, push the annotated tag: `git tag -a v<version> -m "v<version>: SA-n …"` then `git push origin v<version>`.
4. The workflow checks the tag against `package.json` and the CHANGELOG, runs `npm run check`, builds, packages and creates the pre-release titled `v<version>` with the CHANGELOG section as notes. The notes end with an **Install on Arcade** block.
5. Copy that block's `version`, `download_url` and `sha256` into Arcade's `config/games.php`.

For a milestone title (`v0.2.0: M2 Versus`), create the release by hand before pushing the tag, or rename it afterward; the workflow keeps an existing release's title and notes.

Started by hand (`gh workflow run release.yml --ref <branch>`), the workflow is a dry run: the archive is kept as the run's artifact (`gh run download`) and no release changes.

Archives are repeatable: the same commit built with the same tools gives the same SHA-256. `npm run package` writes one into `release/` on any branch; `npm run release:archive` does the same after the `release:check` checks (or on the commit its tag points to).

A published archive is never replaced: if the attached one's hash differs from a new build, the run fails and leaves the release alone. Fix a bad release with a new patch version. Only for a release Arcade doesn't use yet, delete the archive from the release (`gh release delete-asset v<version> splat-attack-<version>.tar.gz`) and re-run the job.

## Workflow

Tracked in the Vikunja project **Splat Attack** (`SA`). One Dev ticket = one OpenSpec change = one branch: propose → review → apply → archive → tag. Art tickets (SA-18 to SA-25 and SA-30) don't use OpenSpec.

## License

Code is under the [MIT License](LICENSE). Artwork is copyright its artist, david, all rights reserved: see [ART-LICENSE.md](ART-LICENSE.md).
