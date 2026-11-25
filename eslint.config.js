import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/', 'coverage/', 'test-results/', 'playwright-report/', 'videos/', 'art/', 'openspec/'],
  },
  js.configs.recommended,
  {
    rules: {
      // Allow intentionally unused args/vars like Phaser's update(_time, delta).
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  // Game code runs in the browser.
  { files: ['src/**/*.js'], languageOptions: { globals: globals.browser } },
  // Unit tests run in Node (Vitest) against pure modules.
  { files: ['tests/**/*.js'], languageOptions: { globals: globals.node } },
  // Playwright specs run in Node but pass callbacks into the page.
  { files: ['e2e/**/*.js'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  // Scripts and root config files run in Node; record.js also passes callbacks into the page.
  { files: ['scripts/**/*.js', '*.config.js'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  // Build-time constants injected by vite.config.js `define` (declared in src/types/globals.d.ts).
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: { globals: { __APP_VERSION__: 'readonly', __APP_COMMIT__: 'readonly' } },
  },
  prettier,
];
