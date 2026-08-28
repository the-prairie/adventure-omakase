import { defineConfig } from '@playwright/test';

import { sharedPlaywrightConfig } from './playwright.shared.js';

export default defineConfig(sharedPlaywrightConfig, {
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
  },
});
