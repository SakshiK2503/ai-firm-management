import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // The local dev DB (PGlite via `prisma dev`) gets flaky/slow under concurrent requests from
  // multiple parallel workers doing real logins/navigations - same root cause as the Vitest
  // fileParallelism fix (see vitest.config.ts). Real Postgres in CI wouldn't need this, but
  // running everything sequentially here keeps local and CI behavior identical.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: 'npm run build && npm run start -- -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
