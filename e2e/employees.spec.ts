import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

test.describe('employees admin', () => {
  test('Partner can create an employee and view/edit their detail page', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/employees');

    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    await page.getByLabel('Full name').fill('E2E Test Employee');
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Temporary password').fill('a-strong-password');
    await page.getByRole('button', { name: 'Add employee' }).click();

    const employeeLink = page.getByRole('link', { name: 'E2E Test Employee' });
    await expect(employeeLink).toBeVisible();

    await employeeLink.click();
    await expect(page.getByRole('heading', { name: 'E2E Test Employee' })).toBeVisible();
    await expect(page.getByText(uniqueEmail)).toBeVisible();
    await expect(page.getByText('Not tracked yet')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Name').fill('E2E Renamed Employee');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: 'E2E Renamed Employee' })).toBeVisible();
  });

  test('a Manager can view the employee list but not create employees', async ({ page }) => {
    await loginViaApi(page, SEED_MANAGER_EMAIL);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Employees' })).toBeVisible();

    await page.goto('/employees');
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveCount(0);
  });

  test('a Preparer sees no Employees nav link and cannot view the page directly', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_PREPARER_EMAIL);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Employees' })).toHaveCount(0);

    await page.goto('/employees');
    await expect(page.getByText("You don't have permission to view this page.")).toBeVisible();
  });
});
