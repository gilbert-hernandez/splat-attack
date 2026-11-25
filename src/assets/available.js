// Which art files actually exist in src/assets/img/, mapped file name -> URL.
// Vite resolves this at build time (hashed URLs in production); in dev it is HMR-aware,
// so reload the page after adding a PNG (restart `npm run dev` if it isn't picked up).
const found = import.meta.glob('./img/*.png', { eager: true, query: '?url', import: 'default' });

export const AVAILABLE_FILES = Object.fromEntries(
  Object.entries(found).map(([path, url]) => [path.replace('./img/', ''), url]),
);
