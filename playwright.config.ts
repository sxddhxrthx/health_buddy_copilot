import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  // Bound parallel browser startup/precache traffic on developer laptops.
  workers: 2,
  expect: { timeout: 10000 },
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'off', screenshot: 'only-on-failure' },
  webServer: {
    command: 'node --import tsx tests/browser/server.ts',
    url: 'http://127.0.0.1:3001/api/health',
    reuseExistingServer: false,
    env: { APP_ORIGIN: 'http://127.0.0.1:3001', RESEARCH_TWIN_DATA_DIR: '.local/e2e' },
  },
  projects: [
    { name: 'desktop-edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium', channel: 'msedge' },
    },
  ],
});
