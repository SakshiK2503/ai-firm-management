import { expect, test } from '@playwright/test';
import { loginViaApi } from './helpers';

test.describe('app shell', () => {
  test('desktop: sidebar nav is visible without interaction', async ({ page }) => {
    await loginViaApi(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: /menu/i })).toBeHidden();
  });

  test('mobile: sidebar nav is hidden until the menu button is used', async ({ page }) => {
    await loginViaApi(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).not.toBeInViewport();

    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    await expect(nav).toBeInViewport();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(nav).not.toBeInViewport();
  });
});
