import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:3000', ...devices['Desktop Chrome'], channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' }
});
