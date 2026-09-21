import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

test.describe('client instructions', () => {
  test('a Manager can set and clear client instructions', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/clients');
    const clientName = `E2E Instructions Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();
    await expect(page.getByRole('heading', { name: clientName, exact: true })).toBeVisible();
    const clientUrl = page.url();

    await page.request.post('/api/auth/logout');
    await loginViaApi(page, SEED_MANAGER_EMAIL);
    await page.goto(clientUrl);

    // A Manager can't rename the client itself (editStructural)...
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    await expect(page.getByText('No instructions recorded yet.')).toBeVisible();

    // ...but can set instructions (editContact).
    await page.getByRole('button', { name: 'Edit instructions' }).click();
    await page.getByLabel('Instructions').fill('Always CC the CFO on GST filings.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Always CC the CFO on GST filings.')).toBeVisible();

    await page.getByRole('button', { name: 'Edit instructions' }).click();
    await page.getByLabel('Instructions').fill('');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('No instructions recorded yet.')).toBeVisible();
  });

  test('a Preparer cannot view a client to see its instructions (no assignment mechanism yet)', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/clients');
    const clientName = `E2E Instructions Preparer Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();
    await expect(page.getByRole('heading', { name: clientName, exact: true })).toBeVisible();
    const clientUrl = page.url();

    await page.request.post('/api/auth/logout');
    await loginViaApi(page, SEED_PREPARER_EMAIL);
    await page.goto(clientUrl);
    await expect(page.getByRole('heading', { name: 'Instructions' })).toHaveCount(0);
  });
});
