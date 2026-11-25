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
  // Own port, so this never collides with Gun Hands (5173). Browser tests use 5175 and 5176.
  server: { port: 5174, strictPort: true },
  build: {
    // Phaser is one large module; don't warn about it on every build.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      // All of src/, so untested files (scenes) show as 0% instead of being hidden.
      include: ['src/**/*.js'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
