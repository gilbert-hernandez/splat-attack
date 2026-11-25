# Design

## Context

- `MatchRunner` reads one mask per tick and records it. Anything that only produces masks replays by itself.
- Keys pressed during a settle are used up by its ticks; a held key carries into the next pair.
- Phaser handles touches as DOM events arrive, between ticks. It tracks one touch by default and ignores others. A cancelled touch arrives as a `pointerup` with `wasCanceled`. A finger that leaves the canvas sends no moves, but its release still arrives.
- One frame can run several ticks, so a lock and the next tick's input can fall in the same frame.

## Goals / Non-Goals

**Goals:** the pair stays under the finger; a sloppy sideways drag never drops it; SA-28 can add buttons without changing the gesture logic.

**Non-Goals:** final feel. SA-29 tunes the values on real phones.

## Decisions

- **A pure class beside `MatchInput`.** `TouchGestures` has `begin(id, x, y, scale)`, `move(id, x, y)`, `end(id)`, `cancel(id)`, `lock()`, `releaseAll()` and `next()`. No Phaser and no clock: time is counted in `next()` calls. The scene reads `keys.next() | touch.next()`. *Alternative:* turning gestures into fake key presses, which brings held-key repeat and can't queue moves.
- **Units.** Positions are game pixels. `scale` is CSS pixels per game pixel, so thresholds can be in CSS pixels, the same physical size on any screen. A column is 32 game pixels, the size of a board column, but at least 24 CSS pixels (landscape phones).
- **Sideways: relative steps.** Each step crossed moves the anchor by one step, so turning back always takes one full step and the pair doesn't jitter, and pushing past a wall adds nothing to undo. The first step takes half a column, so a short flick still moves once. Steps add to a signed queue (a turn back cancels queued moves), limited to 6, the widest move. `next()` uses one per tick. *Alternative:* aiming at the finger's column, which needs the state and makes walls and kicks hard.
- **During a settle** steps are used up, as key taps are. A sideways drag continues through a lock and moves the next pair only with new movement.
- **Axis.** A press is undecided until it travels 10 CSS px. It becomes a drop only when the downward distance is at least 1.5 times the sideways distance; otherwise it is sideways if that is the larger one, else it stays undecided (upward, or diagonal between the two). The axis then holds until the finger lifts.
- **Drop** holds from that moment, also when the finger rests or goes back up, until the finger lifts or the pair locks. After a lock that press does nothing more.
- **Tap** is an undecided press that never travelled 10 CSS px, lifted within 18 ticks. It rotates on release, so a drag never rotates first. A lock during the press cancels the tap, so it can't turn the next pair by accident. The press can still become a drag.
- **Lock signal.** `MatchScene.tick` calls `lock()` on a `lock` event, inside the tick loop, so the same frame's next tick already sees it.
- **Ownership.** `begin` while another finger owns the gesture is ignored, and so are other ids' moves and releases. A press that began under a menu is never owned, so lifting it in the match does nothing. The scene starts gestures only for `wasTouch` presses that aren't over an interactive object, which is what SA-28's buttons will need.
- **Release.** `releaseAll` on pause, resume, focus loss, a new match, and every layout change (positions shift under the finger). Touch cancel also drops moves still queued.

## Risks / Trade-offs

- [Tap on release adds delay] → about 100 ms, and a press-down rotation would fire at the start of every drag. SA-28's buttons can act on press.
- [A diagonal drag does nothing for a moment] → it decides as it goes on; e2e and unit tests cover angles around both limits.
- [Dropping and steering in one drag isn't possible] → required by the ticket; lift and drag again.
- [Fast-forward (8×, dev only) shortens the tap time] → accepted.
- [Synthetic touches differ from real ones] → e2e sends them through Chromium's input pipeline (CDP), and the manual task uses a phone.
