import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  // Bound parallel browser startup/precache traffic on developer laptops.
  workers: 2,
  expect: { timeout: 10000 },
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3001/api/health',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop-edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium', channel: 'msedge' },
    },
  ],
});
