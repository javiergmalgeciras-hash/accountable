import { defineConfig, devices } from '@playwright/test';
import { TEST_NOW } from './e2e/clock';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    ...devices['Desktop Chrome'],
    launchOptions: { channel: 'chrome' },
  },
  webServer: [
    {
      command: 'npm run e2e:prepare && uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8001',
      url: 'http://127.0.0.1:8001/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { PILATES_DATABASE_URL: 'sqlite:///./data/playwright.sqlite', PILATES_TEST_NOW: TEST_NOW },
    },
    {
      command: 'npm run dev --workspace frontend -- --host 127.0.0.1 --port 5174',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { PILATES_API_ORIGIN: 'http://127.0.0.1:8001' },
    },
  ],
});
