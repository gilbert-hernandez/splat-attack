# Splat Attack: plan (approved 2026-11-24, mobile added 2026-11-25)

Vikunja: new project **Splat Attack** (`SA`) · Repo: `~/SplatAttack` · Branch: `master` · Code: Gilbert · Art: david

## 1. The game

A single-player, **score-chasing** versus puzzle game for the browser (Phaser 4 + Vite): drop pairs of living paint blobs, connect 4+ of one color to splat them, set up chain reactions, and bury CPU rivals in gunk. Beating rivals keeps the run going; the **score** is the goal. A sitewide leaderboard comes after the demo, and the engine is built ready for it.

**Genre mechanics** (as in falling-pair versus puzzlers like Mean Bean Machine): falling pairs with rotation, connect-4 clears, gravity chains, attacks that drop junk on the opponent, and a ladder of CPU rivals.

**What makes it ours.** Mean Bean Machine is the genre reference only. Its characters, beans, art, screen layouts, stages, music, sounds, dialogue and score/attack tables are not used.

- **Theme:** rival street painters fighting over city walls. Original cast, drawn by david.
- **The Wall (signature mechanic):** each splat stains the cells behind it. Splatting on your own matching stain adds score and attack power; a different color repaints the cell. Where you clear matters, not just what.
- **Splat Attack (meter move):** splats fill a paint meter. When full, fire it to choose one: *Rinse* (remove pending gunk) or *Bomb* (clear a 3×3 area and stain it).
- **Gunk:** dried paint. Doesn't match; an adjacent splat cracks it, a second clears it.
- **Board:** 7 × 12 visible + 2 hidden rows, 32 px cells (224×384). Loss = the spawn cell is blocked after a settle.
- **Attack:** our own formula, all values in `src/config/`.

### Scoring

- Points come from splat size, chain length, multi-color splats, stain matches and sent gunk. Chains and stains pay most, so skill beats speed-dropping.
- Winning adds a bonus for a quick win and a clean board.
- **No farming:** the win bonus decays and drop speed and gunk pressure rise over a match, so stalling against an easy rival costs more than it earns.
- **Ladder run:** five rivals make a lap. Each new lap is harder. The first loss ends the run and its score stands, so there are no continues.
- Ladder and Endless scores are never mixed.

### Leaderboard-ready (no leaderboard in the demo)

- Each finished run produces a **run record**: game version, `rulesVersion`, mode, seed, player inputs, score, stats.
- The pure engine can replay a record in Node and recompute the score, so a future server can verify scores instead of trusting the browser.
- `rulesVersion` rises whenever a change affects scores or bot behavior. Scores compare only within one `rulesVersion`.
- The demo keeps personal bests in the browser only. No accounts, names or network calls.

### Rivals that play differently every time

- **No scripted moves.** Bots evaluate the current boards, then make a seeded weighted choice among the strongest placements.
- **Per-match variation:** every match gets a fresh seed that shifts the rival's plan, risk, patience, preferred colors and area of the board. Each rival keeps a recognizable style.
- **Adapts during the match:** reacts to the player's threats, stains and meter, the score gap and incoming gunk, and changes plans when one fails.
- **Reproducible:** the bot runs on seed + game state with a fixed per-tick budget, and no wall clock, so replays still verify.
- **Fair:** variation changes how a rival plays, with strength held in a band, so scores don't depend much on luck.

### Demo definition of done

- Title → mode select → match → result → next rival or run over → play again
- Modes: **Ladder** (5 CPU rivals per lap, scored), **Endless** (solo, scored)
- Rivals pass the variety and fairness tests (section 3)
- Every run ends with its score, breakdown and personal best, and makes a verifiable run record
- 5 colors, Wall stains, meter move, gunk, chains, pause, HUD
- Matches last about 2–4 minutes; david's art fully swapped in
- Colors distinguishable without hue (each blob has its own face/shape)
- Playable on phones by touch alone, in portrait and landscape
- Live at splatattack.hernandez.solutions and listed in Arcade

Controls: A/D or ←/→ move · S or ↓ soft drop · Q/E or Z/X rotate · Space meter · Esc pauses

Touch: drag to move, tap to rotate clockwise, drag down to soft drop, plus on-screen rotate, meter and pause buttons

Not in the demo: leaderboard, accounts, local or online multiplayer, story mode. Sound is optional (SA-16).

## 2. Architecture

- `src/core/`: pure rules engine with no Phaser. Seeded RNG, fixed 60 Hz ticks. Integer math only, so results match across browsers and Node. Same seed + inputs = same match.
- `src/ai/`: bots return inputs through the same interface as players.
- `src/scenes/`: Boot → Preload → Title → ModeSelect → Match (+ UI), Pause, Result. They render engine state and events.
- **Screens:** landscape and desktop are 960×540. Portrait is 360 px wide and 640–780 px tall, with the player board at 1× and a half-size rival board. Scenes take positions from a layout config.
- **Touch** becomes the same per-tick input masks as keys, so rules and replays don't change.
- `src/config/`: every tunable. `src/assets/manifest.js`: every graphic, with generated placeholders at the right size.

## 3. Testing tools

Carried over from Gun Hands:

- Vitest + coverage, Prettier, ESLint, JSDoc type-checking, `npm run check`
- Playwright `npm run e2e` with a video per test; `npm run record` for gameplay videos
- Manifest ↔ `ASSETS.md` sync test; GitHub Actions CI
- `window.__GAME__` and debug shortcuts in dev builds only; `ignoreWindowBlur` e2e helper

New, because the engine is deterministic:

- **ASCII board fixtures:** draw a board, run inputs, compare the result board
- **Replays:** save seed + inputs from a match; CI replays them and compares a state hash
- **`npm run sim`:** headless bot-vs-bot matches reporting win rate, match length, max chain, score spread. Used for balance
- **`npm run sim -- --variety`:** each rival plays 200 matches with the **same pieces** against the same opponent, changing only the bot seed. Proposed pass: at least 95% distinct 8-move openings, average move overlap below 50%, and strength still in its band. Targets are confirmed in the SA-11 proposal. CI runs a short version
- **`npm run verify -- run.json`:** replays a run record and confirms its score
- **Scoring tests:** known boards give known scores; a stalling bot must score worse than one that plays to win
- **Debug keys:** set next pair, load a board, send gunk, fill meter, step one tick, force win/loss
- E2E drives engine ticks directly, avoiding the wall-clock flakiness seen in GH-4/6/10

## 4. Versioning (from the first ticket)

- SemVer 0.x. `package.json` is the only source; the title screen shows it (`-dev (<commit>)` in dev).
- A change that affects scores or bots also bumps `rulesVersion`; a test of stored replay hashes fails if someone forgets.
- **Each Dev ticket** bumps the patch and adds a dated `CHANGELOG.md` section with its SA number. The bump is the last OpenSpec task. After merge: annotated tag `vX.Y.Z`.
- **The last ticket of a milestone** bumps the minor instead.
- **Every tag** gets a GitHub pre-release with the `dist/` archive, its SHA-256 and the Arcade `config/games.php` values, made by `.github/workflows/release.yml` (SA-31).
- Art tickets don't bump; SA-14 does when their files land.
- A unit test fails if `package.json` and the newest CHANGELOG version differ. `npm run release:check` confirms the version isn't already tagged and the tree is clean.

| Milestone | Tickets | Releases |
|---|---|---|
| M1 Core | SA-1 to SA-6 | 0.0.1 … 0.0.5, then **0.1.0** |
| M2 Versus | SA-26 to SA-29 (mobile), then SA-7 to SA-13, with SA-31 after SA-11 | 0.1.1 … 0.1.11, then **0.2.0** |
| M3 Art & Polish | SA-14 to SA-17 (+ Art) | 0.2.1 … 0.2.3, then **0.3.0** (demo) |

## 5. Workflow

One Dev ticket = one OpenSpec change = one branch (`sa-3-pair-control`) off `master`, merged `--ff-only`.

1. Propose → ticket to **Review** → Gilbert approves
2. Apply → **In Progress** → `openspec validate <change> --strict`, `npm run check`, `npm run e2e`
3. Version + changelog → archive → validate → merge → tag → **Done** (set `done: true` too)

Every commit and push needs Gilbert's OK, no Claude co-author lines. Use the GitHub no-reply email in this repo. Art tickets don't use OpenSpec.

## 6. Dev tickets

| # | Ticket | OpenSpec change | Key acceptance criteria | After |
|---|---|---|---|---|
| SA-1 | Project setup: scaffold, scenes, manifest, versioning | `setup-phaser-project` | 960×540 FIT; placeholders; `ASSETS.md`; version on title; CHANGELOG + version test | — |
| SA-2 | Dev tooling & CI | `add-dev-tooling` | All commands in section 3 run; CI green; `release:check` | 1 |
| SA-3 | Board engine: grid, seeded RNG, pair control | `add-board-engine` | Move, rotate, wall kick, soft drop, lock, spawn, top-out; ASCII fixtures | 2 |
| SA-4 | Splat rules: matching, gravity, chains, scoring | `add-splat-rules` | 4+ clears; multi-group and 5+ step chain fixtures; replay hashes match | 3 |
| SA-5 | Board rendering & input | `add-board-view` | Smooth fall, next-pair preview, ghost, held-key repeat; view can't change rules | 4 |
| SA-6 | Endless mode loop | `add-endless-mode` | Play to top-out, speed ramp, result, restart; debug keys; first recording | 5 |
| SA-26 | Responsive layout | `add-responsive-layout` | Portrait and landscape layouts for every scene; rotating mid-match keeps the match and pauses it; desktop unchanged | 6 |
| SA-27 | Touch gestures | `add-touch-gestures` | Drag, tap, drag-down drop; axis lock; a touch match replays to the same hash | 26 |
| SA-28 | Touch buttons & touch-only flow | `add-touch-buttons` | Rotate, pause and meter slot; multi-touch; automatic touch/keyboard mode; title to result by touch | 27 |
| SA-29 | Phone hardening & device pass | `mobile-device-pass` | Page gestures blocked, safe areas, pause on blur, touch recording, real iPhone and Android | 28 |
| SA-7 | Wall stains | `add-wall-stains` | Stain, match bonus and repaint are in the engine and visible | 29 |
| SA-8 | Versus: two boards, attacks, gunk | `add-versus-gunk` | Attack formula, pending queue, offset, crack then clear, win/loss; portrait and landscape | 7 |
| SA-9 | Splat Attack meter | `add-splat-meter` | Fill, Rinse, Bomb, limits; works on both boards and by touch | 8 |
| SA-10 | CPU rivals + `npm run sim` | `add-cpu-rivals` | 5 bots with different styles; sim report shows rising strength; no frame hitches | 9 |
| SA-11 | Rival variety & adaptation | `add-rival-variety` | Per-match variation, mid-match adaptation; `--variety` passes; strength and score spread stay in band | 10 |
| SA-31 | Release workflow | `add-release-workflow` | A version tag makes a GitHub pre-release with the repeatable archive, `.sha256` and Install on Arcade block; dry run by hand; never replaces a published archive | 11 |
| SA-12 | Ladder run, scoring & run records | `add-ladder-scoring` | Laps, run over on first loss, bonuses, anti-farming test, `rulesVersion`, `npm run verify`, local bests | 11 |
| SA-13 | HUD and game flow | `add-hud-game-flow` | Mode select, prominent score, chain, meter, pending gunk, boards hidden on pause, portrait and landscape, result breakdown + personal best | 12 |
| SA-14 | Integrate david's art | `integrate-art-assets` | No placeholder warnings; animations; 1×/2× visual check in both orientations | 13, all Art |
| SA-15 | Juice & balance | `juice-balance-pass` | Splat FX, shake, chain callouts, score popups; sim targets met; colorblind check; smooth on a phone | 14 |
| SA-16 | Sound & music (optional) | `add-audio` | Original or licensed audio only; credits; mute. If cut, the M3 patch numbers shift | 15 |
| SA-17 | Deploy demo + list in Arcade | `deploy-demo` | Subdomain + TLS, deploy script, social preview, phone check, Arcade entry | 15 |

## 7. Art tickets (assigned to david)

Pixel art, transparent PNG, single-row strips, no padding, `sa_<category>_<name>_<anim>.png`. Attach PNGs + sources, move to **Review**. All designs must be original: please don't use Mean Bean Machine or Puyo art as a reference.

| # | Ticket | Deliverables |
|---|---|---|
| SA-18 | **Style guide, palette & blob concept (start here)** | 16–24 color palette, 5 blob designs at 32×32 (distinct face + shape), city-wall mood, one landscape and one portrait mock-up |
| SA-19 | Paint blobs | 5 × `sa_blob_<color>_`: idle 4f, land 3f, splat 5f (32×32); horizontal + vertical bridge per color (16×16) |
| SA-20 | Gunk & wall stains | Gunk whole/cracked/break; 5 stains at 32×32, readable but low contrast |
| SA-21 | FX | Splat burst, chain flash, attack projectile, Rinse, Bomb |
| SA-22 | Rivals | Player painter + 5 rivals: 96×96 portraits: idle 4f, attack 3f, hurt 2f, win 3f, lose 3f |
| SA-23 | Backgrounds & board frames | 5 city walls at 960×540; player/rival board frames (224×384 opening) |
| SA-24 | UI kit | Buttons, meter, score panel, next-pair box, pending-gunk icons, ladder map, font pick |
| SA-25 | Logo, title & result panels | 480×160 logo, title background, result panel, 1200×630 social image |
| SA-30 | Mobile | 5 city walls + title background at 360×780; portrait logo, result and ladder panels; touch button and icons |

SA-18 precedes SA-19–25. SA-30 follows SA-24 and SA-25. SA-18–25 and SA-30 all block SA-14. Exact sizes go in `ASSETS.md`, which wins any disagreement.

## 8. Vikunja (created 2026-11-24)

Project id 10, identifier `SA`, shared with david (read & write). Kanban view 48: To Do 39 → In Progress 40 → Review 42 → Done 41. Labels: Dev 31, Art 32, M1 Core 33, M2 Versus 36, M3 Art & Polish 35. Task ids: SA-1 to SA-25 = 200 to 224; SA-26 to SA-30 = 227 to 231; SA-31 = 286. SA-26 to SA-29 and SA-31 use the M2 Versus label.

## 9. Schedule

Ticket dates in Vikunja are the source of truth. Dev starts Tue 11/24, in evening and weekend gaps outside the routine. M1 done 11/25, mobile 11/28 to 11/30 (in M1's freed sessions), M2 by 12/19, art from 12/7 to 12/23 (after Gun Hands), M3 from 1/2, demo Sun 1/10. Sat 12/5 and Sun 12/6 are left to Gun Hands.
