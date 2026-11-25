# Design

## Context

- Phaser 4.2.1 makes one touch pointer by default. It reports a touch cancel as `pointerup`, also to the object under it, so today a cancelled touch activates a `Button`.
- A scene that has captured an event hides it from the scenes below, for all the fingers in that event. A paused scene gets no `pointerout`, so a button tapped to pause would stay highlighted.
- `TouchGestures` already ignores presses over interactive objects and fingers it doesn't own.
- Landscape Ladder leaves 56 px at each side (36–40 CSS px on a phone), too little for a button. On a phone the 960×540 screen is scaled by about 0.59–0.72.
- `e2e/landscape.spec.js` fixes every position at 960×540. `LayoutManager` moves scenes without restarting them, and any change releases touch.

## Goals / Non-Goals

**Goals:** SA-9 adds the meter button by placing one more button in its slot; desktop doesn't change.

**Non-Goals:** final sizes and feel, which SA-29 tunes on phones.

## Decisions

- **Buttons live in `MatchScene`,** not the UI overlay, so a press on one can't hide another finger's touch from the match. `input.activePointers` becomes 5.
- **Rotate on press, pause on release.** Rotation is timing-critical; release adds about 100 ms, and a tap on the board already works that way. So a touch that the system cancels *after* the press has already turned the pair, as with a key. The ticket's "cancelled touches don't activate buttons" holds for everything that acts on release. *Alternative:* rotate on release, which meets it literally but makes the buttons feel slow.
- **Rotation goes through `MatchInput.turn(action)`,** which sets the same pending bit as a key. It holds nothing, so a finger resting on it doesn't repeat and `releaseAll` drops it.
- **One press rule, used by `Button` and `TouchButton`.** A button remembers the pointer that pressed it. Only that pointer's release on it acts, and not if `wasCanceled`. Hover applies to the mouse only. Layout changes and pausing clear the press.
- **`InputMode`** is a small class that knows `touch` or `keyboard`. `main.js` feeds it from window listeners in the capture phase, so the mode has changed before Phaser handles the event: `touchstart`/`touchend`/`touchcancel` (the count of `event.touches` says whether a finger is down), `pointerdown` from a mouse, and `keydown` for game keys only (phones send others, such as volume). It starts from `(pointer: coarse)`. *Alternative:* Phaser's input events, which arrive after hit testing and are missed by paused scenes.
- **The switching touch.** The layout changes before the touch is hit-tested. New buttons accept input from the next frame, so that touch can't press one but can be a gesture.
- **No switch to keyboard while a finger is down,** so keys and gestures still combine and the layout can't move under a finger.
- **Mode is part of the layout.** `layoutFor(screen, mode)` returns `touch`, and in landscape touch mode the match part from its own config. Scenes keep their single `onLayout` callback. Rotation alone pauses.
- **Positions** (game px, hit area):

  | | Portrait | Landscape |
  |---|---|---|
  | Counterclockwise | 104×104 at x 8, in the touch area | 104×104, left side, low |
  | Meter slot | 104×104 at x 128, in the touch area | 104×104, left side, above it |
  | Clockwise | 104×104 at x 248, in the touch area | 104×104, right side, low |
  | Pause | 56×56, top right (area grows from 48) | 96×96, right side, top |

  Portrait's three are centered vertically in the touch area. Landscape uses the outer 120 px of each side. At the smallest windows in the spec, the scales are 0.86 and 0.59, so the smallest targets are 48.4 and 56.9 CSS px. Art is drawn at 1× (72×72 button, 48×48 icon), smaller than its target; pause is the icon alone.
- **Landscape touch Ladder:** player cells at x 136 (next boxes at 376), rival at 600. That leaves 440–592 free between the boards. Endless doesn't move.
- **Gestures still work everywhere else,** including the empty meter slot.
- **Result** buttons ignore touch presses until the existing key delay ends. The mouse isn't delayed. On tall phones TITLE sits where the rotate buttons were, so mashing could leave the result.
- **Debug hint** hides in touch mode; it overlaps the touch area and needs a keyboard.
- **Placeholders:** generated squares can't be told apart, so a missing icon is replaced by a text symbol, as the title does for the logo.

## Risks / Trade-offs

- [Boards jump when a hybrid laptop switches mode in landscape Ladder] → rare, never under a finger, and the match goes on.
- [Phones with large system bars, such as 667×331] → 0.61 scale, still above 48 CSS px.
- [A finger slides from a drag onto a button] → nothing; buttons act only on presses that begin on them.
- [Thumbs cover the rotate buttons differently on real hands] → checked on a phone here, tuned in SA-29.
