import type { Page } from '@playwright/test';

// Must match prisma/seed-data.ts's SEED_*_EMAIL / SEED_OWNER_PASSWORD exports.
export const SEED_OWNER_EMAIL = 'owner@zelox.in';
export const SEED_MANAGER_EMAIL = 'manager@zelox.in';
export const SEED_PREPARER_EMAIL = 'preparer@zelox.in';
export const SEED_OWNER_PASSWORD = 'ChangeMe123!';

/** Logs in via the API directly (not the UI) so tests that aren't about the login form itself
 * don't have to drive it. Cookies set via page.request are shared with page navigation. */
export async function loginViaApi(page: Page, email: string = SEED_OWNER_EMAIL) {
  await page.request.post('/api/auth/login', {
    data: { email, password: SEED_OWNER_PASSWORD },
  });
}
