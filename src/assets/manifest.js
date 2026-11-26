// Every graphic the game loads. Pure data (no Phaser), so it can be unit-tested. Game code refers
// to assets ONLY by `key`. ASSETS.md must list the same files (tests/manifest.test.js checks).
//
//   key          'blob_red_idle' (the file name without sa_ and .png)
//   type         'spritesheet' (single-row strip) or 'image'
//   frameWidth/frameHeight/frames   one frame's size, and the frame count
//   category     placeholder color
//   shape        optional placeholder shape (see placeholders.js)
//   ticket       Art ticket that delivers it

/** @typedef {{key: string, file: string, type: string, frameWidth: number, frameHeight: number, frames: number, category: string, ticket: string, shape?: string, color?: string}} AssetEntry */

export const TYPES = ['spritesheet', 'image'];
export const CATEGORIES = ['blob', 'gunk', 'stain', 'fx', 'char', 'bg', 'board', 'ui'];
export const FILE_PATTERN = /^sa_[a-z0-9]+(_[a-z0-9]+)+\.png$/;

// Blob colors. The shape only affects placeholders: each color also differs by silhouette.
export const COLORS = [
  { name: 'red', shape: 'circle', color: '#ef4444' },
  { name: 'yellow', shape: 'triangle', color: '#facc15' },
  { name: 'green', shape: 'square', color: '#22c55e' },
  { name: 'blue', shape: 'diamond', color: '#3b82f6' },
  { name: 'purple', shape: 'cross', color: '#a855f7' },
];
export const CHARACTERS = ['player', 'rival1', 'rival2', 'rival3', 'rival4', 'rival5'];

/** 'sa_blob_red_idle.png' -> 'blob_red_idle' */
export function keyFor(file) {
  return file.replace(/^sa_/, '').replace(/\.png$/, '');
}

/** @returns {AssetEntry} */
const sheet = (file, w, h, frames, ticket, extra = {}) => ({
  key: keyFor(file),
  file,
  type: 'spritesheet',
  frameWidth: w,
  frameHeight: h,
  frames,
  category: file.split('_')[1],
  ticket,
  ...extra,
});

/** @returns {AssetEntry} */
const image = (file, w, h, ticket, extra = {}) => ({ ...sheet(file, w, h, 1, ticket, extra), type: 'image' });

/** @type {AssetEntry[]} */
export const MANIFEST = [
  // SA-19 Paint blobs
  ...COLORS.flatMap(({ name, shape, color }) => [
    sheet(`sa_blob_${name}_idle.png`, 32, 32, 4, 'SA-19', { shape, color }),
    sheet(`sa_blob_${name}_land.png`, 32, 32, 3, 'SA-19', { shape, color }),
    sheet(`sa_blob_${name}_splat.png`, 32, 32, 5, 'SA-19', { shape, color }),
    image(`sa_blob_${name}_bridge_h.png`, 16, 16, 'SA-19', { color }),
    image(`sa_blob_${name}_bridge_v.png`, 16, 16, 'SA-19', { color }),
  ]),

  // SA-20 Gunk and wall stains
  image('sa_gunk_whole.png', 32, 32, 'SA-20'),
  image('sa_gunk_cracked.png', 32, 32, 'SA-20'),
  sheet('sa_gunk_break.png', 32, 32, 5, 'SA-20'),
  ...COLORS.map(({ name, color }) => image(`sa_stain_${name}.png`, 32, 32, 'SA-20', { color })),

  // SA-21 FX
  sheet('sa_fx_burst.png', 64, 64, 6, 'SA-21'),
  sheet('sa_fx_chain.png', 64, 64, 5, 'SA-21'),
  sheet('sa_fx_attack.png', 32, 32, 4, 'SA-21'),
  sheet('sa_fx_rinse.png', 64, 64, 6, 'SA-21'),
  sheet('sa_fx_bomb.png', 96, 96, 6, 'SA-21'),

  // SA-22 Characters
  ...CHARACTERS.flatMap((name) => [
    sheet(`sa_char_${name}_idle.png`, 96, 96, 4, 'SA-22'),
    sheet(`sa_char_${name}_attack.png`, 96, 96, 3, 'SA-22'),
    sheet(`sa_char_${name}_hurt.png`, 96, 96, 2, 'SA-22'),
    sheet(`sa_char_${name}_win.png`, 96, 96, 3, 'SA-22'),
    sheet(`sa_char_${name}_lose.png`, 96, 96, 3, 'SA-22'),
  ]),

  // SA-23 Backgrounds and board frames
  ...[1, 2, 3, 4, 5].map((n) => image(`sa_bg_wall${n}.png`, 960, 540, 'SA-23')),
  image('sa_board_frame_player.png', 240, 400, 'SA-23', { shape: 'frame' }),
  image('sa_board_frame_rival.png', 240, 400, 'SA-23', { shape: 'frame' }),

  // SA-24 UI kit
  image('sa_ui_meter_frame.png', 200, 16, 'SA-24'),
  image('sa_ui_meter_fill.png', 196, 12, 'SA-24'),
  image('sa_ui_score_panel.png', 200, 64, 'SA-24'),
  image('sa_ui_next_box.png', 64, 96, 'SA-24'),
  image('sa_ui_gunk_small.png', 24, 24, 'SA-24'),
  image('sa_ui_gunk_medium.png', 24, 24, 'SA-24'),
  image('sa_ui_gunk_large.png', 24, 24, 'SA-24'),
  image('sa_ui_icon_rinse.png', 32, 32, 'SA-24'),
  image('sa_ui_icon_bomb.png', 32, 32, 'SA-24'),
  sheet('sa_ui_button.png', 160, 48, 3, 'SA-24'),
  image('sa_ui_ladder.png', 400, 300, 'SA-24'),

  // SA-25 Title and result
  image('sa_ui_logo.png', 480, 160, 'SA-25'),
  image('sa_ui_title_bg.png', 960, 540, 'SA-25'),
  image('sa_ui_result_panel.png', 400, 300, 'SA-25'),

  // SA-30 Portrait screens
  ...[1, 2, 3, 4, 5].map((n) => image(`sa_bg_wall${n}_portrait.png`, 360, 780, 'SA-30')),
  image('sa_ui_title_bg_portrait.png', 360, 780, 'SA-30'),
  image('sa_ui_logo_portrait.png', 320, 112, 'SA-30'),
  image('sa_ui_result_panel_portrait.png', 340, 400, 'SA-30'),
  image('sa_ui_ladder_portrait.png', 340, 400, 'SA-30'),
  sheet('sa_ui_touch_button.png', 72, 72, 2, 'SA-30'),
  ...['cw', 'ccw', 'pause', 'meter'].map((name) => image(`sa_ui_touch_${name}.png`, 48, 48, 'SA-30')),
];

/** Look up an entry by key (throws on typos so they surface immediately). */
export function asset(key) {
  const entry = MANIFEST.find((e) => e.key === key);
  if (!entry) throw new Error(`Unknown asset key: ${key}`);
  return entry;
}

const isPosInt = (n) => Number.isInteger(n) && n > 0;

/**
 * Check a manifest for mistakes; returns readable errors (empty when valid).
 * @param {Array<Record<string, any>>} [entries]
 * @returns {string[]}
 */
export function validate(entries = MANIFEST) {
  const errors = [];
  const keys = new Set();
  const files = new Set();
  entries.forEach((e, i) => {
    const where = `entry ${i} (${e.key ?? e.file ?? '?'})`;
    if (!e.key) errors.push(`${where}: missing key`);
    else if (keys.has(e.key)) errors.push(`${where}: duplicate key "${e.key}"`);
    keys.add(e.key);
    if (!FILE_PATTERN.test(e.file ?? '')) errors.push(`${where}: bad file name "${e.file}"`);
    else if (files.has(e.file)) errors.push(`${where}: duplicate file "${e.file}"`);
    files.add(e.file);
    if (!TYPES.includes(e.type)) errors.push(`${where}: unknown type "${e.type}"`);
    if (!CATEGORIES.includes(e.category)) errors.push(`${where}: unknown category "${e.category}"`);
    if (!isPosInt(e.frameWidth) || !isPosInt(e.frameHeight)) errors.push(`${where}: frame size must be positive`);
    if (!isPosInt(e.frames)) errors.push(`${where}: frames must be an integer >= 1`);
    if (e.type === 'image' && e.frames !== 1) errors.push(`${where}: images have exactly 1 frame`);
  });
  return errors;
}
