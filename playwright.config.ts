import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Dev DB is hosted (Supabase) - same reasoning as the Vitest fileParallelism fix (see
  // vitest.config.ts): the free-tier direct connection has a low shared connection limit, so
  // parallel workers each doing real logins/navigations would compete for it. Also keeps local
  // and CI behavior identical.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  // Real network round-trips to a hosted DB are slower than localhost - the default 5s
  // `expect()` timeout can be too tight for an action that involves a create-then-list DB
  // round-trip, even though nothing is actually wrong.
  expect: { timeout: 15_000 },
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
