import { defineConfig, devices } from '@playwright/test';

// LT_PORT lets several checkouts run their tests at once without sharing a server.
const port = Number(process.env.LT_PORT) || 4400;

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  outputDir: '../qa/artifacts/test-results',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: `node scripts/serve.mjs --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: true, cwd: '..' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
