import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

// The engine must give the same results everywhere, so it can't use anything outside the rules.
const purity = 'The engine must be pure and deterministic.';
const pureRules = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          regex: '^(?!\\./[\\w-]+\\.js$|\\.\\./(core|ai)/[\\w-]+\\.js$|\\.\\./config/rules\\.js$)',
          message: `${purity} Import only from core, ai and config/rules.js.`,
        },
      ],
    },
  ],
  'no-restricted-globals': [
    'error',
    ...[...new Set([...Object.keys(globals.browser), ...Object.keys(globals.node), 'Date', 'Intl', 'globalThis'])].map(
      (name) => ({ name, message: purity }),
    ),
  ],
  'no-restricted-syntax': [
    'error',
    ...[
      'MemberExpression[object.name="Math"][computed=true]',
      'MemberExpression[object.name="Math"][property.name!=/^(abs|floor|imul|max|min)$/]',
      ':not(MemberExpression) > Identifier[name="Math"]',
    ].map((selector) => ({ selector, message: `${purity} Use only Math.abs, floor, imul, max and min.` })),
    { selector: 'Literal[raw=/^[0-9_]*[.][0-9]|^[0-9._]+e-/i]', message: `${purity} Use integers only.` },
    { selector: 'ImportExpression', message: `${purity} No dynamic imports.` },
    { selector: 'MetaProperty', message: `${purity} No import.meta.` },
  ],
};

// Drawing can't change the rules: the view may import only what reads the state.
const readOnly = 'The view only reads the match state.';
const readers = ['COLUMNS', 'ROWS', 'EMPTY', 'cellAt', 'isGrounded', 'otherCell', 'landingCells'];
const viewRules = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { regex: '/core/', allowImportNames: readers, message: readOnly },
        { regex: '/(match|scenes|ai)/', message: readOnly },
      ],
    },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: 'ImportExpression', message: readOnly },
    { selector: 'ExportAllDeclaration', message: readOnly },
  ],
};

export default [
  {
    ignores: ['dist/', 'coverage/', 'test-results/', 'playwright-report/', 'videos/', 'release/', 'art/', 'openspec/'],
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
  { files: ['src/core/**/*.js', 'src/ai/**/*.js', 'src/config/rules.js'], rules: pureRules },
  {
    files: ['src/config/rules.js'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ regex: '.', message: purity }] }] },
  },
  { files: ['src/view/**/*.js'], rules: viewRules },
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
