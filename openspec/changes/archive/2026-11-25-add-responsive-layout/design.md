# Design

## Context

- Phaser's FIT mode can change size while running: `scale.setGameSize` resizes the canvas and emits `RESIZE` on the game's scale manager, and cameras covering the whole screen follow. The listener runs for paused scenes too.
- Positions are inline in six scenes and the debug hint, and in `BOARD` and `VIEW.next`. `BoardView` draws at 1× with absolute positions, and e2e reads those.
- Match is paused under Pause, so its `update` doesn't run when the window rotates there.

## Goals / Non-Goals

**Goals:** SA-8, SA-9 and SA-28 find their space already in the config; landscape is the same to the pixel.

**Non-Goals:** final portrait look. Sizes may move in SA-13 and SA-29.

## Decisions

- **Shape comes from the window, not the device.** Taller than wide means portrait; square or wider means landscape. Portrait height is `360 × height / width`, rounded down to an even number and kept within 640–780. Outside that range FIT adds bars. *Alternative:* touch detection, which is unreliable on hybrids and hard to test; it would also leave tall desktop windows with a tiny game.
- **Pure functions.** `screenFor(width, height)` and `layoutFor(screen)` in `src/layout/` have no Phaser and are unit tested. `layoutFor` reads `src/config/layout.js` and returns plain positions per scene; extra portrait height goes to the touch area, and menus are centered.
- **One owner.** `src/layout/manager.js` listens to `RESIZE`, compares the parent's size with the current screen, and calls `setGameSize` only when it differs (so its own event ends there). A zero-size parent is ignored. It then emits `layout` with the new and old screen.
- **Scenes get `onLayout(scene, place)`.** It calls `place(layout)` now and after each change, and unsubscribes at shutdown. Objects are made once in `create` and only moved in `place`. *Alternative:* restarting scenes, which loses the match, the result's ready state and Pause's input delay.
- **Match** places its boards and draws once (also while paused), and then opens Pause if the orientation flipped. A match already paused stays as it is; a finished one ignores it. During GAME OVER it pauses, as Esc does.
- **Boards** keep position and scale in `BoardView` (`place({x, y, scale})`), applied when drawing. Crops stay in texture pixels. The rival is 0.5× in portrait (16 px cells). Pools, ids and depths are unchanged, so e2e still reads scene positions. *Alternative:* a container per board, which changes the depth order and what tests read.
- **Buttons** cancel a press in progress when the layout changes.
- **Art per orientation:** the layout names the texture key for the title background, logo and result panel. Portrait backgrounds are 360×780, centered, so up to 70 px crops off the top and bottom. A missing portrait file shows the same fallback as its landscape one.

### Portrait match (360 × H, H 640–780)

| Area | x | y | Size | Notes |
|---|---|---|---|---|
| HUD: mode, score, level | 56 | 0 | 248×56 | Text at y 10, 28 and 46 |
| Pause button (SA-28) | 304 | 4 | 48×48 | Reserved |
| Pending gunk (SA-8) | 0 | 56 | 360×28 | Reserved, 24 px icons |
| Player frame | 0 | 84 | 240×400 | Ladder; cells at 8, 92 |
| Next boxes | 268 | 84, 184 | 64×96 each | Ladder |
| Rival frame | 240 | 284 | 120×200 | Ladder; cells at 244, 288 |
| Meter (SA-9) | 8 | 488 | 200×16 | Reserved |
| Touch controls (SA-28) | 0 | 512 | 360×(H−520) | 120 px at H 640, 260 at H 780 |

Ladder fills the width exactly: 240 + 120 = 360. Endless has no rival, so its board and next boxes are centered: frame at x 24, next boxes at x 272. The debug hint wraps inside the touch area, at its bottom.

Portrait menus are centered on 180, relative to the center of the screen: title (logo 320×112, Start, controls hint wrapped), mode select (three buttons stacked), Pause (two stacked), Result (340×400 panel, two buttons stacked).

## Risks / Trade-offs

- [Landscape moves by accident] → before refactoring, a test records every object's position in each scene at 960×540 and later compares it; it stays as a regression test.
- [A resize loop] → the manager compares before setting, with a unit test for settling after one change and an e2e that counts changes.
- [Phones report the old size during a rotation] → each report is compared again, so the last one wins; Pause opens only once. SA-29 checks on real devices.
- [The portrait boards touch the screen's edges] → only the 8 px frames do, not the cells.
- [Cropped or scaled sprites blur at 0.5×] → positions are rounded; the e2e checks the rival frame's and cells' bounds, and SA-8 checks moving blobs.
- [A short portrait window has bars at the sides] → accepted; the minimum height keeps 120 px for touch controls.
