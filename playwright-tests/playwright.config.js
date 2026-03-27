// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 90000,
  retries: 0,
  workers: 1, // run sequentially
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: 'on',
    video: 'off',
    trace: 'off',
    actionTimeout: 20000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  outputDir: 'test-results',
});
