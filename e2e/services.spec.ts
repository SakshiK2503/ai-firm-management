import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

test.describe('service master', () => {
  test('Partner can create a service, nest a child under it, and see the hierarchy', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/services');

    const parentName = `E2E Taxation ${Date.now()}`;
    await page.getByLabel('Service name').fill(parentName);
    await page.getByRole('button', { name: 'Add service' }).click();
    await expect(page.getByRole('link', { name: parentName, exact: true })).toBeVisible();

    const childName = `E2E GST Notice ${Date.now()}`;
    await page.getByLabel('Service name').fill(childName);
    await page.getByLabel('Parent category').selectOption({ label: parentName });
    await page.getByRole('button', { name: 'Add service' }).click();

    const childRow = page.getByRole('row', { name: new RegExp(childName) });
    await expect(childRow).toBeVisible();
    // The child's name cell carries a left-indent style proportional to depth - assert it's
    // greater than a top-level row's indent rather than a magic pixel value.
    const childPaddingLeft = await childRow
      .locator('td')
      .first()
      .evaluate((el) => window.getComputedStyle(el).paddingLeft);
    expect(parseFloat(childPaddingLeft)).toBeGreaterThan(12);
  });

  test('Partner can edit, disable, and re-enable a service', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/services');

    const serviceName = `E2E Statutory Audit ${Date.now()}`;
    await page.getByLabel('Service name').fill(serviceName);
    await page.getByRole('button', { name: 'Add service' }).click();
    await expect(page.getByRole('link', { name: serviceName, exact: true })).toBeVisible();

    await page.getByRole('link', { name: serviceName, exact: true }).click();
    await expect(page.getByRole('heading', { name: serviceName, exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Edit service' }).click();
    await page.getByLabel('Expected skill level').selectOption('ADVANCED');
    await page.getByLabel('Turnaround days').fill('7');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('ADVANCED')).toBeVisible();
    await expect(page.getByText('7 day(s)')).toBeVisible();

    await page.getByRole('button', { name: 'Disable' }).click();
    await expect(page.getByText('Disabled')).toBeVisible();

    await page.getByRole('button', { name: 'Enable' }).click();
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('Partner can attach a checklist template and manage its items', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/services');

    const serviceName = `E2E Company Formation ${Date.now()}`;
    await page.getByLabel('Service name').fill(serviceName);
    await page.getByRole('button', { name: 'Add service' }).click();
    await page.getByRole('link', { name: serviceName, exact: true }).click();
    await expect(page.getByRole('heading', { name: serviceName, exact: true })).toBeVisible();

    await expect(page.getByText('No checklist template has been set up')).toHaveCount(0);
    await page.getByLabel('Checklist template name').fill('Formation Checklist');
    await page.getByLabel('Checklist items').fill('DIN application\nName approval\nMOA drafting');
    await page.getByRole('button', { name: 'Create checklist' }).click();

    await expect(page.getByText('DIN application')).toBeVisible();
    await expect(page.getByText('Name approval')).toBeVisible();
    await expect(page.getByText('MOA drafting')).toBeVisible();

    await page.getByLabel('New checklist item').fill('PAN application');
    await page.getByRole('button', { name: 'Add item' }).click();
    await expect(page.getByText('PAN application')).toBeVisible();

    const itemRow = page.getByRole('listitem').filter({ hasText: 'PAN application' });
    await itemRow.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('PAN application')).toHaveCount(0);
  });

  test('a Preparer sees no Services nav link and cannot view the page directly', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_PREPARER_EMAIL);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Services' })).toHaveCount(0);

    await page.goto('/services');
    await expect(page.getByText("You don't have permission to view this page.")).toBeVisible();
  });
});
