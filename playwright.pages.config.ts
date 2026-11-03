import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: './tests/pages', workers: 1, fullyParallel: false, timeout: 45000, reporter: [['list'], ['json', { outputFile: 'test-results/pages-results.json' }]], use: { baseURL: 'http://127.0.0.1:4173/aMocaDaPipoca/', ...devices['Desktop Chrome'], channel: 'chrome', screenshot: 'only-on-failure' } });
