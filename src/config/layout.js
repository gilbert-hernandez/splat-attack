// Where everything goes, in game pixels. (x, y) is the center of menu text, buttons and panels, and
// the top-left of boards (their cells, inside the frame), next boxes and areas.
// Read it through src/layout/layout.js, which fits it to the screen.
export const SCREENS = {
  landscape: { width: 960, height: 540 },
  // Portrait is as tall as the window's shape allows, within these.
  portrait: { width: 360, minHeight: 640, maxHeight: 780 },
};

// `bottom` instead of `y` is measured up from the screen's bottom edge.
// `match.buttons` are the touch buttons' tap targets (top-left and size); `touch` replaces parts of the
// layout in touch mode.
export const LAYOUT = {
  landscape: {
    preload: { bar: { x: 480, y: 270, width: 320, height: 16 }, text: { x: 480, y: 246, size: 16 } },
    title: {
      background: { x: 480, y: 270, key: 'ui_title_bg' },
      logo: { x: 480, y: 170, key: 'ui_logo', size: 72 },
      start: { x: 480, y: 330, size: 18 },
      hint: { x: 480, y: 460, size: 14 },
      version: { x: 8, bottom: 8, size: 14 },
    },
    modeSelect: {
      heading: { x: 480, y: 140, size: 36 },
      ladder: { x: 480, y: 240, size: 18 },
      endless: { x: 480, y: 310, size: 18 },
      back: { x: 480, y: 420, size: 18 },
    },
    pause: {
      heading: { x: 480, y: 160, size: 40 },
      resume: { x: 480, y: 260, size: 18 },
      quit: { x: 480, y: 330, size: 18 },
    },
    result: {
      panel: { x: 480, y: 270, key: 'ui_result_panel' },
      heading: { x: 480, y: 150, size: 36 },
      mode: { x: 480, y: 188, size: 18 },
      score: { x: 480, y: 222, size: 28 },
      stats: { x: 480, y: 254, spacing: 22, size: 16 },
      again: { x: 390, y: 372, size: 18 },
      title: { x: 570, y: 372, size: 18 },
    },
    match: {
      ladder: {
        player: { x: 64, y: 100, scale: 1, next: { x: 304, y: 100, spacing: 104 } },
        rival: { x: 672, y: 100, scale: 1 },
        gameOver: { x: 176, y: 270 },
      },
      endless: {
        player: { x: 368, y: 100, scale: 1, next: { x: 608, y: 100, spacing: 104 } },
        gameOver: { x: 480, y: 270 },
      },
      debugHint: { x: 480, bottom: 12 },
      // In the outer 120 px of each side.
      buttons: {
        pause: { x: 852, y: 16, width: 96, height: 96 },
        meter: { x: 8, y: 280, width: 104, height: 104 },
        ccw: { x: 8, y: 400, width: 104, height: 104 },
        cw: { x: 848, y: 400, width: 104, height: 104 },
      },
    },
    // Ladder's boards move inward to clear the buttons, and text grows to stay readable on small
    // phones (see TEXT below).
    touch: {
      preload: { text: { size: 21 } },
      title: {
        start: { size: 21 },
        hint: { size: 21, wrap: 720 },
        version: { size: 21 },
      },
      modeSelect: { ladder: { size: 21 }, endless: { size: 21 }, back: { size: 21 } },
      pause: { resume: { size: 21 }, quit: { size: 21 } },
      result: {
        mode: { size: 21 },
        stats: { spacing: 26, size: 21 },
        again: { y: 384, size: 21 },
        title: { y: 384, size: 21 },
      },
      ui: {
        mode: { size: 21 },
        score: { size: 21 },
        level: { size: 21 },
      },
      match: {
        ladder: {
          player: { x: 136, y: 100, scale: 1, next: { x: 376, y: 100, spacing: 104 } },
          rival: { x: 600, y: 100, scale: 1 },
          gameOver: { x: 248, y: 270 },
        },
      },
    },
    ui: {
      mode: { x: 480, y: 20, size: 20 },
      score: { x: 480, y: 46, size: 20 },
      level: { x: 480, y: 72, size: 20 },
    },
  },

  // Written for the shortest screen (640).
  portrait: {
    preload: { bar: { x: 180, y: 320, width: 320, height: 16 }, text: { x: 180, y: 296, size: 16 } },
    title: {
      background: { x: 180, y: 320, key: 'ui_title_bg_portrait' },
      logo: { x: 180, y: 190, key: 'ui_logo_portrait', size: 40 },
      start: { x: 180, y: 340, size: 18 },
      hint: { x: 180, y: 470, wrap: 336, size: 14 },
      version: { x: 8, bottom: 8, size: 14 },
    },
    modeSelect: {
      heading: { x: 180, y: 160, size: 36 },
      ladder: { x: 180, y: 270, size: 18 },
      endless: { x: 180, y: 340, size: 18 },
      back: { x: 180, y: 450, size: 18 },
    },
    pause: {
      heading: { x: 180, y: 210, size: 40 },
      resume: { x: 180, y: 310, size: 18 },
      quit: { x: 180, y: 380, size: 18 },
    },
    result: {
      panel: { x: 180, y: 320, key: 'ui_result_panel_portrait' },
      heading: { x: 180, y: 160, size: 36 },
      mode: { x: 180, y: 200, size: 18 },
      score: { x: 180, y: 240, size: 28 },
      stats: { x: 180, y: 284, spacing: 26, size: 16 },
      again: { x: 180, y: 420, size: 18 },
      title: { x: 180, y: 480, size: 18 },
    },
    match: {
      ladder: {
        player: { x: 8, y: 92, scale: 1, next: { x: 268, y: 84, spacing: 100 } },
        rival: { x: 244, y: 288, scale: 0.5 },
        gameOver: { x: 120, y: 284 },
      },
      endless: {
        player: { x: 32, y: 92, scale: 1, next: { x: 272, y: 84, spacing: 100 } },
        gameOver: { x: 144, y: 284 },
      },
      debugHint: { x: 180, bottom: 24, wrap: 344 },
      // Space kept free. `hud` holds the ui texts; extra screen height goes to `touch`.
      areas: {
        hud: { x: 56, y: 0, width: 248, height: 56 },
        gunk: { x: 0, y: 56, width: 360, height: 28 },
        meter: { x: 8, y: 488, width: 200, height: 16 },
        touch: { x: 0, y: 512, width: 360, height: 120 },
      },
      // Pause in the top-right corner; the rest centered in the touch area, also when it grows.
      buttons: {
        pause: { x: 304, y: 0, width: 56, height: 56 },
        ccw: { x: 8, y: 520, width: 104, height: 104 },
        meter: { x: 128, y: 520, width: 104, height: 104 },
        cw: { x: 248, y: 520, width: 104, height: 104 },
      },
    },
    ui: {
      mode: { x: 180, y: 10, size: 14 },
      score: { x: 180, y: 28, size: 20 },
      level: { x: 180, y: 46, size: 14 },
    },
  },
};

// Smallest text, in CSS px, on the smallest windows the game supports (scales 0.86 and 0.59): 14 game
// px in portrait and 21 in landscape touch mode. Keyboard landscape is for desktops, so it keeps its sizes.
export const TEXT = {
  minCssPx: 12,
  smallestWindows: { portrait: [375, 553], landscape: [568, 320] },
};
