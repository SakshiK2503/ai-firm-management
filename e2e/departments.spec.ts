import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

test.describe('departments admin', () => {
  test('Partner can create, search, and disable a department', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/departments');

    const uniqueName = `E2E Dept ${Date.now()}`;
    await page.getByLabel('New department name').fill(uniqueName);
    await page.getByRole('button', { name: 'Add department' }).click();
    await expect(page.getByText(uniqueName)).toBeVisible();

    await page.getByLabel('Search departments').fill(uniqueName);
    await expect(page.getByText(uniqueName)).toBeVisible();
    await expect(page.locator('table')).not.toContainText('Accounts');

    await page.getByLabel('Search departments').fill('');
    const row = page.getByRole('row', { name: new RegExp(uniqueName) });
    await row.getByRole('button', { name: 'Disable' }).click();
    await expect(row.getByText('Disabled')).toBeVisible();
  });

  test('a Preparer sees no Departments nav link and cannot view the page directly', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_PREPARER_EMAIL);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Departments' })).toHaveCount(0);

    await page.goto('/departments');
    await expect(page.getByText("You don't have permission to view this page.")).toBeVisible();
  });

  test('disabling a department with an active employee surfaces a warning instead of touching the employee', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/departments');

    const deptName = `E2E Staffed Dept ${Date.now()}`;
    await page.getByLabel('New department name').fill(deptName);
    await page.getByRole('button', { name: 'Add department' }).click();
    await expect(page.getByText(deptName)).toBeVisible();

    await page.goto('/employees');
    const employeeName = `E2E Dept Employee ${Date.now()}`;
    await page.getByLabel('Full name').fill(employeeName);
    await page.getByLabel('Email').fill(`e2e-dept-employee-${Date.now()}@example.com`);
    await page.getByLabel('Temporary password').fill('a-strong-password');
    await page.getByLabel('Department').selectOption({ label: deptName });
    await page.getByRole('button', { name: 'Add employee' }).click();
    await expect(page.getByRole('link', { name: employeeName, exact: true })).toBeVisible();

    await page.goto('/departments');
    const row = page.getByRole('row', { name: new RegExp(deptName) });
    await row.getByRole('button', { name: 'Disable' }).click();
    await expect(row.getByText('Disabled')).toBeVisible();
    await expect(row.getByText('1 active employee still assigned here')).toBeVisible();

    // The employee itself is untouched - disabling the department is not a cascading action.
    await page.goto('/employees');
    const employeeRow = page.getByRole('row', { name: new RegExp(employeeName) });
    await expect(employeeRow.getByText('Active')).toBeVisible();
  });
});
