import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

test.describe('employees admin', () => {
  test('Partner can create an employee and view/edit their detail page', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/employees');

    // Names (not just emails) are made unique per run - this spec runs against the shared local
    // dev DB, and duplicate names from earlier runs would make role/label locators ambiguous.
    const suffix = Date.now();
    const uniqueEmail = `e2e-${suffix}@example.com`;
    const name = `E2E Test Employee ${suffix}`;
    const renamedName = `E2E Renamed Employee ${suffix}`;

    await page.getByLabel('Full name').fill(name);
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Temporary password').fill('a-strong-password');
    await page.getByRole('button', { name: 'Add employee' }).click();

    const employeeLink = page.getByRole('link', { name, exact: true });
    await expect(employeeLink).toBeVisible();

    await employeeLink.click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByText(uniqueEmail)).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill(renamedName);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: renamedName, exact: true })).toBeVisible();
  });

  test('Partner can assign a manager and a reporting cycle is rejected', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/employees');

    const suffix = Date.now();
    const managerName = `E2E Manager Employee ${suffix}`;
    const reportName = `E2E Report Employee ${suffix}`;

    await page.getByLabel('Full name').fill(managerName);
    await page.getByLabel('Email').fill(`e2e-manager-${suffix}@example.com`);
    await page.getByLabel('Temporary password').fill('a-strong-password');
    await page.getByRole('button', { name: 'Add employee' }).click();
    await expect(page.getByRole('link', { name: managerName, exact: true })).toBeVisible();

    await page.getByLabel('Full name').fill(reportName);
    await page.getByLabel('Email').fill(`e2e-report-${suffix}@example.com`);
    await page.getByLabel('Temporary password').fill('a-strong-password');
    await page.getByLabel('Manager').selectOption({ label: managerName });
    await page.getByRole('button', { name: 'Add employee' }).click();

    await page.getByRole('link', { name: reportName, exact: true }).click();
    await expect(page.getByRole('heading', { name: reportName, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: managerName, exact: true })).toBeVisible();

    // Now try to close the loop the other way: make the manager report to their own report.
    await page.goto('/employees');
    await page.getByRole('link', { name: managerName, exact: true }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    // The edit form's Role select wraps its options in a native <label>, so its computed
    // accessible name includes every role option's text - including "Manager", one of the
    // three seeded system roles. Exact matching is needed to disambiguate it from the actual
    // Manager field.
    await page.getByLabel('Manager', { exact: true }).selectOption({ label: reportName });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page.getByText('This assignment would create a circular reporting chain.'),
    ).toBeVisible();
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
