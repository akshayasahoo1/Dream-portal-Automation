import { defineConfig, devices } from '@playwright/test';
import { ENV } from './src/config/env';

const launchOptions = {
  executablePath: ENV.chromiumPath,
  args: ENV.noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
};

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: ENV.isCI,
  retries: ENV.isCI ? 1 : 0,
  workers: ENV.isCI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results', detail: true, suiteTitle: true }],
  ],

  use: {
    baseURL: ENV.baseUrl,
    headless: ENV.headless,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1366, height: 768 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: /unit\//,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 }, launchOptions },
    },
    { name: 'firefox', testIgnore: /unit\//, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: /unit\//, use: { ...devices['Desktop Safari'] } },
    // Pure-logic tests, no browser involved
    { name: 'unit', testMatch: /unit\/.*\.spec\.ts/ },
  ],

  // `npm run test:mock` serves the bundled replica of the site so the suite can run offline.
  webServer: ENV.useMock
    ? {
        command: 'node mock-site/server.js',
        url: `http://localhost:${ENV.mockPort}/index.html`,
        reuseExistingServer: !ENV.isCI,
        timeout: 15_000,
        env: { MOCK_PORT: String(ENV.mockPort) },
      }
    : undefined,
});
