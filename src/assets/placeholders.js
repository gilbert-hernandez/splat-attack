// Generated stand-ins for art that isn't delivered yet: the declared size and frame count,
// registered under the real key, so game code behaves the same with or without the PNG.

export const CATEGORY_COLORS = {
  blob: '#e5e7eb',
  gunk: '#78716c',
  stain: '#6b7280',
  fx: '#f9fafb',
  char: '#22d3ee',
  bg: '#262238',
  board: '#8b5cf6',
  ui: '#e5e7eb',
};

const FRAME_BORDER = 8;

/** Darken a #rrggbb color by `amount` (0..1). */
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - amount;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Horizontal spans filling `shape` in a size×size cell, one per row that has pixels.
 * @param {string} shape circle | triangle | square | diamond | cross
 * @param {number} size
 * @returns {Array<{x: number, y: number, w: number}>}
 */
export function shapeSpans(shape, size) {
  const mid = size / 2;
  const r = mid - 1;
  const spans = [];
  for (let y = 1; y < size - 1; y++) {
    const dy = Math.abs(y + 0.5 - mid);
    let half; // half width of this row
    if (shape === 'circle') half = Math.sqrt(Math.max(0, r * r - dy * dy));
    else if (shape === 'diamond') half = r - dy;
    else if (shape === 'triangle') half = ((y - 0.5) / (size - 2)) * r;
    else if (shape === 'cross') half = dy < r / 3 ? r : r / 3;
    else half = r - 2; // square
    if (shape === 'square' && dy > r - 2) continue;
    const x = Math.round(mid - half);
    const w = Math.round(half * 2);
    if (w > 0) spans.push({ x, y, w });
  }
  return spans;
}

/** Small marks, one more per frame, so animation is visible. */
function drawTicks(ctx, x, y, w, color, ticks) {
  const size = Math.max(1, Math.floor(w / 12));
  ctx.fillStyle = shade(color, 0.75);
  for (let t = 0; t < ticks; t++) ctx.fillRect(x + t * size * 2, y, size, size);
}

function drawFrame(ctx, x, entry, color, ticks) {
  const { frameWidth: w, frameHeight: h } = entry;
  if (entry.shape === 'frame') {
    const b = FRAME_BORDER;
    ctx.fillStyle = color;
    ctx.fillRect(x, 0, w, b);
    ctx.fillRect(x, h - b, w, b);
    ctx.fillRect(x, b, b, h - 2 * b);
    ctx.fillRect(x + w - b, b, b, h - 2 * b);
    return;
  }
  if (entry.shape) {
    ctx.fillStyle = color;
    for (const s of shapeSpans(entry.shape, w)) ctx.fillRect(x + s.x, s.y, s.w, 1);
    drawTicks(ctx, x + w / 2 - ticks * 2, h / 2, w, color, ticks);
    return;
  }
  ctx.fillStyle = shade(color, 0.45);
  ctx.fillRect(x, 0, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, 1, w - 2, h - 2);
  drawTicks(ctx, x + 2, 2, Math.min(w, 48), color, ticks);
}

/** Draw a manifest entry's placeholder into a new canvas. */
export function drawPlaceholderCanvas(entry, doc = document) {
  const base = entry.color ?? CATEGORY_COLORS[entry.category] ?? '#ff00ff';
  const color = entry.category === 'stain' ? shade(base, 0.6) : base;
  const canvas = doc.createElement('canvas');
  canvas.width = entry.frameWidth * entry.frames;
  canvas.height = entry.frameHeight;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < entry.frames; i++) {
    drawFrame(ctx, i * entry.frameWidth, entry, color, entry.type === 'spritesheet' ? i + 1 : 0);
  }
  return canvas;
}

/** Register a placeholder texture for `entry` in a Phaser scene's texture manager. */
export function createPlaceholder(scene, entry) {
  const canvas = drawPlaceholderCanvas(entry);
  if (entry.type === 'spritesheet') {
    const { frameWidth, frameHeight } = entry;
    scene.textures.addSpriteSheet(entry.key, canvas, { frameWidth, frameHeight });
  } else {
    scene.textures.addCanvas(entry.key, canvas);
  }
}
