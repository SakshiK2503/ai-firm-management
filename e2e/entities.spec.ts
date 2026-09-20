import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL } from './helpers';

test.describe('client legal entities', () => {
  test('Partner can add a legal entity to a client, view it, and edit it', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/clients');

    const clientName = `E2E Entity Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();

    await page.getByRole('button', { name: 'Add legal entity' }).click();
    const entityName = `E2E Entity ${Date.now()}`;
    await page.getByLabel('Entity name').fill(entityName);
    await page.getByLabel('PAN').fill('abcde1234f');
    await page.getByRole('button', { name: 'Add entity' }).click();

    const entityRow = page.getByRole('row', { name: new RegExp(entityName) });
    await expect(entityRow).toBeVisible();
    await expect(entityRow.getByText('ABCDE1234F')).toBeVisible();

    await page.getByRole('link', { name: entityName, exact: true }).click();
    await expect(page.getByRole('heading', { name: entityName, exact: true })).toBeVisible();
    await expect(page.getByText('ABCDE1234F')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('GSTIN').fill('09abcde1234f1z5');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('09ABCDE1234F1Z5')).toBeVisible();
  });

  test('rejects a malformed PAN with a clear error', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/clients');

    const clientName = `E2E Bad PAN Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();

    await page.getByRole('button', { name: 'Add legal entity' }).click();
    await page.getByLabel('Entity name').fill('Bad PAN Entity');
    await page.getByLabel('PAN').fill('not-a-pan');
    await page.getByRole('button', { name: 'Add entity' }).click();

    await expect(page.getByText('Enter a valid PAN (e.g. ABCDE1234F).')).toBeVisible();
  });

  test('a Manager can view entities but not add one', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/clients');
    const clientName = `E2E Manager View Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();
    await expect(page.getByRole('heading', { name: clientName, exact: true })).toBeVisible();
    const clientUrl = page.url();

    await page.request.post('/api/auth/logout');
    await loginViaApi(page, SEED_MANAGER_EMAIL);
    await page.goto(clientUrl);
    await expect(page.getByRole('heading', { name: 'Legal entities' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add legal entity' })).toHaveCount(0);
  });
});
