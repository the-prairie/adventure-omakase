import { defineConfig, devices } from '@playwright/test';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://adventure_omakase:local_development_only@127.0.0.1:54320/adventure_omakase';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: './node_modules/.bin/tsx apps/api/src/server.ts',
      env: {
        ...process.env,
        API_HOST: '127.0.0.1',
        API_PORT: '4000',
        API_CORS_ORIGINS: 'http://127.0.0.1:3000',
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
      },
      url: 'http://127.0.0.1:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: './apps/studio/node_modules/.bin/next dev apps/studio -p 3000',
      env: {
        ...process.env,
        API_BASE_URL: 'http://127.0.0.1:4000',
      },
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
