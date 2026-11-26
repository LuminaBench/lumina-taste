import { defineConfig, devices } from '@playwright/test';

// LT_PORT lets several checkouts run their tests at once without sharing a server.
const port = Number(process.env.LT_PORT) || 4400;
// LT_BROWSERS=webkit,firefox adds Safari's and Firefox's engines (npx playwright install webkit firefox once).
// The default stays Chromium only, so the normal suite and its timings are unchanged.
const extra = (process.env.LT_BROWSERS ?? '').split(',').map((s) => s.trim()).filter((s) => s === 'webkit' || s === 'firefox');
const desktop = { viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  outputDir: '../qa/artifacts/test-results',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: `node scripts/serve.mjs --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: true, cwd: '..' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...desktop } },
    ...(extra.includes('webkit') ? [{ name: 'webkit', use: { ...devices['Desktop Safari'], ...desktop } }] : []),
    ...(extra.includes('firefox') ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'], ...desktop } }] : []),
  ],
});
