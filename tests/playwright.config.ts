import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  outputDir: '../qa/artifacts/test-results',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:4400', trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: 'node scripts/serve.mjs --port 4400', url: 'http://127.0.0.1:4400', reuseExistingServer: true, cwd: '..' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
