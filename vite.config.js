import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The version comes from package.json (its only source). The short commit is read once per Vite
// start and is '' when git has none. See src/util/version.js.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
let commit;
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch (_err) {
  commit = '';
}

export default defineConfig({
  // Relative asset paths so dist/ works from any subdomain or sub-path.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit),
  },
  build: {
    // Phaser is one large module; don't warn about it on every build.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
