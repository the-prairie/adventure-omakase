import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/native',
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'evidence/native-browser.json' }],
  ],
  outputDir: 'evidence/browser-artifacts',
  use: { trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
