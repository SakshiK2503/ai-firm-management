import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

test.describe('clients admin', () => {
  test('Partner can create, search, view, edit, and deactivate a client', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/clients');

    const clientName = `E2E Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await expect(page.getByText(clientName)).toBeVisible();

    await page.getByLabel('Search clients').fill(clientName);
    await expect(page.getByText(clientName)).toBeVisible();

    await page.getByLabel('Search clients').fill('');
    await page.getByRole('link', { name: clientName, exact: true }).click();
    await expect(page.getByRole('heading', { name: clientName, exact: true })).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Active').uncheck();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Inactive')).toBeVisible();

    // Deactivated clients drop out of the default (active-only) list.
    await page.goto('/clients');
    await page.getByLabel('Search clients').fill(clientName);
    await expect(page.getByText('No clients found.')).toBeVisible();

    await page.getByLabel('Show inactive').check();
    const row = page.getByRole('row', { name: new RegExp(clientName) });
    await expect(row.getByText('Inactive')).toBeVisible();
  });

  test('rejects creating a duplicate client name', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/clients');

    const clientName = `E2E Dup Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await expect(page.getByText(clientName)).toBeVisible();

    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await expect(page.getByText(`A client named "${clientName}" already exists.`)).toBeVisible();
  });

  test('a Manager can view all clients but not create one', async ({ page }) => {
    await loginViaApi(page, SEED_MANAGER_EMAIL);
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    await expect(page.getByLabel('New client name')).toHaveCount(0);
  });

  test('a Preparer sees the Clients nav link but no clients (no assignment mechanism yet)', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_PREPARER_EMAIL);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Clients' })).toBeVisible();

    await page.goto('/clients');
    await expect(page.getByText('No clients are currently assigned to you.')).toBeVisible();
    await expect(page.getByLabel('New client name')).toHaveCount(0);
  });
});
