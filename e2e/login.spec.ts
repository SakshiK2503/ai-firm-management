import { expect, test } from '@playwright/test';

// Must match prisma/seed-data.ts's SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD.
const SEED_OWNER_EMAIL = 'owner@zelox.in';
const SEED_OWNER_PASSWORD = 'ChangeMe123!';

test.describe('login page', () => {
  test('logs in with valid seeded credentials and redirects to the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SEED_OWNER_EMAIL);
    await page.getByLabel('Password').fill(SEED_OWNER_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('shows an error message for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SEED_OWNER_EMAIL);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
