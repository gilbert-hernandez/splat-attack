// Stops the browser's own gestures on the whole page, where CSS alone isn't enough: Android's
// long-press menu, text selection, double-tap zoom, and iOS Safari's pinch (it ignores user-scalable).
const BLOCKED = ['contextmenu', 'selectstart', 'dblclick', 'gesturestart', 'gesturechange', 'gestureend'];

/** @param {Document} doc */
export function blockPageGestures(doc = document) {
  for (const type of BLOCKED) {
    doc.addEventListener(type, (event) => event.preventDefault(), { passive: false });
  }
}
