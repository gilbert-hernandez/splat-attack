import { defineConfig, devices } from '@playwright/test';

// Browser tests. Each run starts its own servers on strict ports and never reuses a running one,
// so it can't test another game by mistake. Every test records test-results/<test>/video.webm.
const DEV = 'http://localhost:5175';
const PROD = 'http://localhost:5176';
const viewport = { width: 960, height: 540 };
const chrome = { ...devices['Desktop Chrome'], viewport };

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  // On CI: a stray test.only fails the run, and one retry absorbs a software-WebGL hiccup.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    viewport,
    video: { mode: 'on', size: viewport },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // WebGL in headless Chromium without a GPU.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'dev', testIgnore: /production\.spec/, use: { ...chrome, baseURL: DEV } },
    { name: 'production', testMatch: /production\.spec/, use: { ...chrome, baseURL: PROD } },
  ],
  webServer: [
    { command: 'npx vite --port 5175 --strictPort', url: DEV, reuseExistingServer: false },
    {
      command: 'npm run build && npx vite preview --port 5176 --strictPort',
      url: PROD,
      reuseExistingServer: false,
    },
  ],
});
