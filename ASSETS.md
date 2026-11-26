# Splat Attack: Art Spec

The technical spec for every graphic in the game (SA-19 to SA-25 and SA-30). If a ticket and this file disagree, **this file wins**; tell Gilbert. The style guide (SA-18) sets the look, and may change color names or sizes here.

> The game runs without any art: a missing file becomes a placeholder of the right size. Deliver files in any order.

## Export conventions

- **Originality:** original designs only; please don't use Mean Bean Machine or Puyo Puyo art as a reference.
- **Format:** pixel art, transparent PNG (backgrounds are opaque), exported at 1× with no smoothing and no color profile.
- **Sprite sheets:** one horizontal row of equal frames, with no padding, spacing or margin.
- **Pivot:** frame center. Keep the subject in the same place on every frame.
- **Colors:** each blob color must be recognizable by face and silhouette alone.
- **File names:** exactly as listed, lowercase. A misspelled file is ignored.

## Delivery

1. Export each file with the exact name and size below.
2. Attach the PNGs (and a zip of the sources) to the ticket in Vikunja.
3. Move the ticket to **Review**. Gilbert copies the files into `src/assets/img/` and checks them in the game.

## Asset list

Sizes are per frame (W×H).

### SA-19: Paint blobs

| Ticket | File                          | Size  | Frames | Notes                                                      |
| ------ | ----------------------------- | ----- | ------ | ---------------------------------------------------------- |
| SA-19  | `sa_blob_red_idle.png`        | 32×32 | 4      | Loop; own face and silhouette                              |
| SA-19  | `sa_blob_red_land.png`        | 32×32 | 3      | Squash on landing                                          |
| SA-19  | `sa_blob_red_splat.png`       | 32×32 | 5      | Pops into paint                                            |
| SA-19  | `sa_blob_red_bridge_h.png`    | 16×16 | 1      | Link to the blob on the right; centered on the shared edge |
| SA-19  | `sa_blob_red_bridge_v.png`    | 16×16 | 1      | Link to the blob below; centered on the shared edge        |
| SA-19  | `sa_blob_yellow_idle.png`     | 32×32 | 4      | Loop; own face and silhouette                              |
| SA-19  | `sa_blob_yellow_land.png`     | 32×32 | 3      | Squash on landing                                          |
| SA-19  | `sa_blob_yellow_splat.png`    | 32×32 | 5      | Pops into paint                                            |
| SA-19  | `sa_blob_yellow_bridge_h.png` | 16×16 | 1      | Link to the blob on the right; centered on the shared edge |
| SA-19  | `sa_blob_yellow_bridge_v.png` | 16×16 | 1      | Link to the blob below; centered on the shared edge        |
| SA-19  | `sa_blob_green_idle.png`      | 32×32 | 4      | Loop; own face and silhouette                              |
| SA-19  | `sa_blob_green_land.png`      | 32×32 | 3      | Squash on landing                                          |
| SA-19  | `sa_blob_green_splat.png`     | 32×32 | 5      | Pops into paint                                            |
| SA-19  | `sa_blob_green_bridge_h.png`  | 16×16 | 1      | Link to the blob on the right; centered on the shared edge |
| SA-19  | `sa_blob_green_bridge_v.png`  | 16×16 | 1      | Link to the blob below; centered on the shared edge        |
| SA-19  | `sa_blob_blue_idle.png`       | 32×32 | 4      | Loop; own face and silhouette                              |
| SA-19  | `sa_blob_blue_land.png`       | 32×32 | 3      | Squash on landing                                          |
| SA-19  | `sa_blob_blue_splat.png`      | 32×32 | 5      | Pops into paint                                            |
| SA-19  | `sa_blob_blue_bridge_h.png`   | 16×16 | 1      | Link to the blob on the right; centered on the shared edge |
| SA-19  | `sa_blob_blue_bridge_v.png`   | 16×16 | 1      | Link to the blob below; centered on the shared edge        |
| SA-19  | `sa_blob_purple_idle.png`     | 32×32 | 4      | Loop; own face and silhouette                              |
| SA-19  | `sa_blob_purple_land.png`     | 32×32 | 3      | Squash on landing                                          |
| SA-19  | `sa_blob_purple_splat.png`    | 32×32 | 5      | Pops into paint                                            |
| SA-19  | `sa_blob_purple_bridge_h.png` | 16×16 | 1      | Link to the blob on the right; centered on the shared edge |
| SA-19  | `sa_blob_purple_bridge_v.png` | 16×16 | 1      | Link to the blob below; centered on the shared edge        |

### SA-20: Gunk and wall stains

| Ticket | File                  | Size  | Frames | Notes                                    |
| ------ | --------------------- | ----- | ------ | ---------------------------------------- |
| SA-20  | `sa_gunk_whole.png`   | 32×32 | 1      | Dried paint; clearly not a blob          |
| SA-20  | `sa_gunk_cracked.png` | 32×32 | 1      | One hit from breaking                    |
| SA-20  | `sa_gunk_break.png`   | 32×32 | 5      | Crumbles away                            |
| SA-20  | `sa_stain_red.png`    | 32×32 | 1      | Low contrast, blobs stay readable on top |
| SA-20  | `sa_stain_yellow.png` | 32×32 | 1      | Low contrast, blobs stay readable on top |
| SA-20  | `sa_stain_green.png`  | 32×32 | 1      | Low contrast, blobs stay readable on top |
| SA-20  | `sa_stain_blue.png`   | 32×32 | 1      | Low contrast, blobs stay readable on top |
| SA-20  | `sa_stain_purple.png` | 32×32 | 1      | Low contrast, blobs stay readable on top |

### SA-21: FX

| Ticket | File               | Size  | Frames | Notes                           |
| ------ | ------------------ | ----- | ------ | ------------------------------- |
| SA-21  | `sa_fx_burst.png`  | 64×64 | 6      | Grayscale; the game tints it    |
| SA-21  | `sa_fx_chain.png`  | 64×64 | 5      | Flash when a chain continues    |
| SA-21  | `sa_fx_attack.png` | 32×32 | 4      | Points right; the game flips it |
| SA-21  | `sa_fx_rinse.png`  | 64×64 | 6      | Water splash                    |
| SA-21  | `sa_fx_bomb.png`   | 96×96 | 6      | Covers 3×3 cells                |

### SA-22: Characters

| Ticket | File                        | Size  | Frames | Notes                          |
| ------ | --------------------------- | ----- | ------ | ------------------------------ |
| SA-22  | `sa_char_player_idle.png`   | 96×96 | 4      | Loop                           |
| SA-22  | `sa_char_player_attack.png` | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_player_hurt.png`   | 96×96 | 2      | Play once, hold the last frame |
| SA-22  | `sa_char_player_win.png`    | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_player_lose.png`   | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival1_idle.png`   | 96×96 | 4      | Loop                           |
| SA-22  | `sa_char_rival1_attack.png` | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival1_hurt.png`   | 96×96 | 2      | Play once, hold the last frame |
| SA-22  | `sa_char_rival1_win.png`    | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival1_lose.png`   | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival2_idle.png`   | 96×96 | 4      | Loop                           |
| SA-22  | `sa_char_rival2_attack.png` | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival2_hurt.png`   | 96×96 | 2      | Play once, hold the last frame |
| SA-22  | `sa_char_rival2_win.png`    | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival2_lose.png`   | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival3_idle.png`   | 96×96 | 4      | Loop                           |
| SA-22  | `sa_char_rival3_attack.png` | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival3_hurt.png`   | 96×96 | 2      | Play once, hold the last frame |
| SA-22  | `sa_char_rival3_win.png`    | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival3_lose.png`   | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival4_idle.png`   | 96×96 | 4      | Loop                           |
| SA-22  | `sa_char_rival4_attack.png` | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival4_hurt.png`   | 96×96 | 2      | Play once, hold the last frame |
| SA-22  | `sa_char_rival4_win.png`    | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival4_lose.png`   | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival5_idle.png`   | 96×96 | 4      | Loop                           |
| SA-22  | `sa_char_rival5_attack.png` | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival5_hurt.png`   | 96×96 | 2      | Play once, hold the last frame |
| SA-22  | `sa_char_rival5_win.png`    | 96×96 | 3      | Play once, hold the last frame |
| SA-22  | `sa_char_rival5_lose.png`   | 96×96 | 3      | Play once, hold the last frame |

### SA-23: Backgrounds and board frames

| Ticket | File                        | Size    | Frames | Notes                                       |
| ------ | --------------------------- | ------- | ------ | ------------------------------------------- |
| SA-23  | `sa_bg_wall1.png`           | 960×540 | 1      | Opaque; calm enough not to fight the boards |
| SA-23  | `sa_bg_wall2.png`           | 960×540 | 1      | Opaque; calm enough not to fight the boards |
| SA-23  | `sa_bg_wall3.png`           | 960×540 | 1      | Opaque; calm enough not to fight the boards |
| SA-23  | `sa_bg_wall4.png`           | 960×540 | 1      | Opaque; calm enough not to fight the boards |
| SA-23  | `sa_bg_wall5.png`           | 960×540 | 1      | Opaque; calm enough not to fight the boards |
| SA-23  | `sa_board_frame_player.png` | 240×400 | 1      | Transparent 224×384 opening, 8 px border    |
| SA-23  | `sa_board_frame_rival.png`  | 240×400 | 1      | Transparent 224×384 opening, 8 px border    |

### SA-24: UI kit

| Ticket | File                    | Size    | Frames | Notes                                              |
| ------ | ----------------------- | ------- | ------ | -------------------------------------------------- |
| SA-24  | `sa_ui_meter_frame.png` | 200×16  | 1      | Paint meter                                        |
| SA-24  | `sa_ui_meter_fill.png`  | 196×12  | 1      | Sits 2 px inside the frame; stretched horizontally |
| SA-24  | `sa_ui_score_panel.png` | 200×64  | 1      | Holds the main number on screen                    |
| SA-24  | `sa_ui_next_box.png`    | 64×96   | 1      | Next pair                                          |
| SA-24  | `sa_ui_gunk_small.png`  | 24×24   | 1      | Pending gunk                                       |
| SA-24  | `sa_ui_gunk_medium.png` | 24×24   | 1      | Pending gunk                                       |
| SA-24  | `sa_ui_gunk_large.png`  | 24×24   | 1      | Pending gunk                                       |
| SA-24  | `sa_ui_icon_rinse.png`  | 32×32   | 1      | Meter choice                                       |
| SA-24  | `sa_ui_icon_bomb.png`   | 32×32   | 1      | Meter choice                                       |
| SA-24  | `sa_ui_button.png`      | 160×48  | 3      | Normal, hover, pressed (sheet is 480×48)           |
| SA-24  | `sa_ui_ladder.png`      | 400×300 | 1      | 5 rival slots                                      |

### SA-25: Title and result

| Ticket | File                     | Size    | Frames | Notes                          |
| ------ | ------------------------ | ------- | ------ | ------------------------------ |
| SA-25  | `sa_ui_logo.png`         | 480×160 | 1      | "Splat Attack" logo            |
| SA-25  | `sa_ui_title_bg.png`     | 960×540 | 1      | Opaque; leave the center clear |
| SA-25  | `sa_ui_result_panel.png` | 400×300 | 1      | Behind the score breakdown     |

Not loaded by the game (SA-25): a 1200×630 social-preview image and a 640×360 Arcade thumbnail.

### SA-30: Portrait screens

For phones held upright, where the game is 360 wide and 640 to 780 tall. Reuse the designs from SA-23 to SA-25. The touch button and icons are used in both orientations whenever the player uses touch.

| Ticket | File                              | Size    | Frames | Notes                                                          |
| ------ | --------------------------------- | ------- | ------ | -------------------------------------------------------------- |
| SA-30  | `sa_bg_wall1_portrait.png`        | 360×780 | 1      | Opaque; up to 70 px can be cropped from the top and bottom     |
| SA-30  | `sa_bg_wall2_portrait.png`        | 360×780 | 1      | Opaque; up to 70 px can be cropped from the top and bottom     |
| SA-30  | `sa_bg_wall3_portrait.png`        | 360×780 | 1      | Opaque; up to 70 px can be cropped from the top and bottom     |
| SA-30  | `sa_bg_wall4_portrait.png`        | 360×780 | 1      | Opaque; up to 70 px can be cropped from the top and bottom     |
| SA-30  | `sa_bg_wall5_portrait.png`        | 360×780 | 1      | Opaque; up to 70 px can be cropped from the top and bottom     |
| SA-30  | `sa_ui_title_bg_portrait.png`     | 360×780 | 1      | Opaque, same cropping; leave the center clear                  |
| SA-30  | `sa_ui_logo_portrait.png`         | 320×112 | 1      | Logo for narrow screens                                        |
| SA-30  | `sa_ui_result_panel_portrait.png` | 340×400 | 1      | Behind the score breakdown                                     |
| SA-30  | `sa_ui_ladder_portrait.png`       | 340×400 | 1      | 5 rival slots                                                  |
| SA-30  | `sa_ui_touch_button.png`          | 72×72   | 2      | Normal, pressed (sheet is 144×72); an icon sits centered on it |
| SA-30  | `sa_ui_touch_cw.png`              | 48×48   | 1      | Rotate clockwise; reads without text                           |
| SA-30  | `sa_ui_touch_ccw.png`             | 48×48   | 1      | Rotate counterclockwise; reads without text                    |
| SA-30  | `sa_ui_touch_pause.png`           | 48×48   | 1      | Pause; shown alone, without the button                         |
| SA-30  | `sa_ui_touch_meter.png`           | 48×48   | 1      | Meter move (used from SA-9)                                    |
