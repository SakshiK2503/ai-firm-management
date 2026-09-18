import { expect, test } from '@playwright/test';
import { loginViaApi } from './helpers';

test('redirects a logged-out visitor from the dashboard to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
});

test('redirects an already-logged-in visitor away from /login', async ({ page }) => {
  await loginViaApi(page);
  await page.goto('/login');
  await expect(page).toHaveURL('/');
});
