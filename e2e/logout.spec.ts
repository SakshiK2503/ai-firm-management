import { expect, test } from '@playwright/test';

// Must match prisma/seed-data.ts's SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD.
const SEED_OWNER_EMAIL = 'owner@zelox.in';
const SEED_OWNER_PASSWORD = 'ChangeMe123!';

test('logs out and invalidates the session', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(SEED_OWNER_EMAIL);
  await page.getByLabel('Password').fill(SEED_OWNER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');

  const logoutButton = page.getByRole('button', { name: /Log out/ });
  await expect(logoutButton).toBeVisible();
  await logoutButton.click();

  await expect(page).toHaveURL('/login');

  const response = await page.request.get('/api/auth/me');
  expect(response.status()).toBe(401);
});
