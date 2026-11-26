# Design

## Context

- `index.html` sets only `width=device-width, initial-scale=1`. `html` and `body` are 100% tall with `overflow: hidden`, and nothing sets `touch-action`, `user-select` or `overscroll-behavior`. Phaser calls `preventDefault` on touches over the canvas only, so the letterbox bars still scroll, zoom and select.
- iOS Safari ignores `user-scalable=no` and has its own `gesture*` events for pinching. Android Chrome opens a menu on a long press unless `contextmenu` is cancelled.
- The canvas is always the game's size (360 wide in portrait, 960 in landscape) and scaled up by CSS without smoothing. Phaser 4 has no renderer resolution setting. On an emulated iPhone 13 (DPR 3) portrait text is blocky but readable. In landscape the scale drops to 0.59 at 568×320, so the 14 px title hint is 8.3 CSS px and button labels are 10.6.
- `MatchScene` releases input on Phaser's `BLUR` but keeps playing. Phaser stops its loop on `HIDDEN`, so a backgrounded match freezes unpaused and continues when the page comes back.
- Browser tests block every window `blur` through `ignoreWindowBlur`, because a headless page can lose focus at any time.
- The Chromium bundled with Playwright (159) supports `Emulation.setSafeAreaInsetsOverride`, so tests can set notch and home-bar insets.
- `e2e/support.js` `fingers()` already sends multi-touch through CDP. SA-28 covers two fingers on buttons and gestures, so this change's tests reuse it.

## Goals / Non-Goals

**Goals:** a phone browser behaves like an app for the whole page. Desktop doesn't change. Tuning comes from real devices.

**Non-Goals:** fullscreen, orientation lock, PWA install, and a sharper canvas.

## Decisions

- **Block gestures with CSS first, JS where browsers ignore CSS.** `html` and `body` get `touch-action: none`, `overscroll-behavior: none`, `user-select: none` (and `-webkit-`), `-webkit-touch-callout: none` and a transparent tap highlight. The viewport becomes `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`. A small `src/page.js` cancels `contextmenu`, `selectstart`, `dblclick` and iOS `gesturestart`/`gesturechange` on the document. The game config also sets `disableContextMenu: true`. *Alternative:* cancelling `touchmove` on the document, which needs non-passive listeners and could interfere with Phaser's own handling.
- **Safe areas by CSS insets.** `#game` becomes `position: fixed`, with each side at its `env(safe-area-inset-*)`. Padding wouldn't work, because Phaser measures its parent's bounding box, padding included. So `screenFor` sees the space inside the insets and nothing in the layout code changes. A fixed box follows the visible viewport as browser bars show and hide, and the resize that follows goes through `LayoutManager` as today, where only rotation pauses. *Alternative:* reading `visualViewport` in JS, which is more code for the same result.
- **The letterbox stays the background color,** and the insets show it too, so a notch never cuts the canvas.
- **Pause on `BLUR` and `HIDDEN`.** `MatchScene` calls `openPause()` on both, replacing its blur listener (opening Pause already releases input). No auto-resume: when the page comes back it shows Pause, and the player taps RESUME. A finished match (the result is on its way) isn't paused, as today. On Title, ModeSelect, Pause and Result nothing changes.
- **Tests see synthetic blurs.** `ignoreWindowBlur` lets through events with `isTrusted === false`, so a test can `dispatchEvent(new FocusEvent('blur'))` while headless focus noise stays blocked. Background tests override `document.visibilityState` and `document.hidden`, then dispatch `visibilitychange`.
- **Readable text by size, not resolution.** Rule: every player-facing text is at least **12 CSS px** at the smallest supported windows, 375×553 in portrait (scale 0.86, so 14 game px) and 568×320 in landscape (0.59, so 21 game px). Portrait meets it already. Landscape touch mode sets text sizes through its `touch` layout: title hint, version, buttons, HUD and result lines go to at least 21. `Button` takes an optional `size` from its layout place. Keyboard landscape keeps its sizes, so `e2e/landscape.spec.js` stays unedited. Scene labels and the debug hint are dev-only and exempt. A unit test checks every text size in each layout against the rule. *Alternative:* render the canvas at device resolution with camera zoom. It's sharper, but every scene, the gestures' pointer math and all position helpers in the tests would change, too much for this ticket. If the device pass finds text still poor, it becomes its own ticket.
- **Touch recording.** `npm run record -- --touch` uses a 390×844 viewport with touch and mobile emulation (DPR 1, so the video is the canvas size). Menus are tapped with CDP touches through `fingers()`, pause is opened with the pause button and closed with RESUME, and the match is played by the same greedy `readInput` as the keyboard route. The video can't show fingers, so a small dev-only touch marker could help, but it is left out. The default route doesn't change.
- **Device pass.** Through `npm run dev -- --host` (portproxy as for SA-27), play a full Endless match on an iPhone (Safari) and on an Android phone (Chrome) in both orientations. Write a checklist of the acceptance criteria and the results into the Vikunja task. Only values in `src/config/touch.js` and button places in the layout may change, each with a unit test still passing. Tuning doesn't change replays, because hashes depend on input masks, not on how gestures produce them.

## Risks / Trade-offs

- [`touch-action: none` on the body also blocks scrolling a future HTML overlay] → none exist; anything added later must allow its own.
- [`user-scalable=no` is an accessibility concern on websites] → the game scales to the window itself and its text has a minimum size; the README says so.
- [iOS Safari's bottom bar hides on scroll, and with scrolling blocked it stays] → the game fits above it; the space is lost but nothing is covered.
- [Larger landscape touch text may crowd the layout] → the layout unit tests check overlaps and bounds for both modes, as they do today.
- [Headless Chromium isn't Safari] → automated tests cover Chromium only. The device pass was done on Android only; iPhone is untested and may not be supported. The iOS-specific handling (`gesture*` events, `-webkit-touch-callout`) stays, since it costs nothing.
