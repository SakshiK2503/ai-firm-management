import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

async function createClientAndEntity(page: import('@playwright/test').Page) {
  await page.goto('/clients');
  const clientName = `E2E Contact Client ${Date.now()}`;
  await page.getByLabel('New client name').fill(clientName);
  await page.getByRole('button', { name: 'Add client' }).click();
  await page.getByRole('link', { name: clientName, exact: true }).click();
  await expect(page.getByRole('heading', { name: clientName, exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add legal entity' }).click();
  const entityName = `E2E Contact Entity ${Date.now()}`;
  await page.getByLabel('Entity name').fill(entityName);
  await page.getByRole('button', { name: 'Add entity' }).click();
  await page.getByRole('link', { name: entityName, exact: true }).click();
  await expect(page.getByRole('heading', { name: entityName, exact: true })).toBeVisible();

  return page.url();
}

test.describe('client contacts', () => {
  test('Partner can add a contact, mark it primary, and see it reflected on the entity', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await createClientAndEntity(page);

    await page.getByRole('button', { name: 'Add contact' }).click();
    const contactName = `E2E Contact ${Date.now()}`;
    await page.getByLabel('Name').fill(contactName);
    await page.getByLabel('Designation').fill('Director');
    await page.getByLabel('Primary contact').check();
    await page.getByRole('button', { name: 'Add contact' }).click();

    const contactRow = page.getByRole('row', { name: new RegExp(contactName) });
    await expect(contactRow).toBeVisible();
    await expect(contactRow.getByText('Yes')).toBeVisible();

    // The entity's own "Primary contact" field should reflect it too.
    await expect(page.getByText('Primary contact')).toBeVisible();
    const primaryRow = page.locator('dl').getByText(contactName);
    await expect(primaryRow).toBeVisible();
  });

  test('adding a second primary contact demotes the first', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await createClientAndEntity(page);

    await page.getByRole('button', { name: 'Add contact' }).click();
    const firstName = `E2E First Primary ${Date.now()}`;
    await page.getByLabel('Name').fill(firstName);
    await page.getByLabel('Primary contact').check();
    await page.getByRole('button', { name: 'Add contact' }).click();

    await page.getByRole('button', { name: 'Add contact' }).click();
    const secondName = `E2E Second Primary ${Date.now()}`;
    await page.getByLabel('Name').fill(secondName);
    await page.getByLabel('Primary contact').check();
    await page.getByRole('button', { name: 'Add contact' }).click();

    const firstRow = page.getByRole('row', { name: new RegExp(firstName) });
    const secondRow = page.getByRole('row', { name: new RegExp(secondName) });
    await expect(secondRow.getByText('Yes')).toBeVisible();
    await expect(firstRow.getByText('Yes')).toHaveCount(0);
  });

  test('rejects a duplicate contact name on the same entity', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await createClientAndEntity(page);

    const contactName = `E2E Dup Contact ${Date.now()}`;
    await page.getByRole('button', { name: 'Add contact' }).click();
    await page.getByLabel('Name').fill(contactName);
    await page.getByRole('button', { name: 'Add contact' }).click();
    await expect(page.getByRole('row', { name: new RegExp(contactName) })).toBeVisible();

    await page.getByRole('button', { name: 'Add contact' }).click();
    await page.getByLabel('Name').fill(contactName);
    await page.getByRole('button', { name: 'Add contact' }).click();
    await expect(
      page.getByText(`A contact named "${contactName}" already exists for this entity.`),
    ).toBeVisible();
  });

  test('a Manager can add and remove a contact (editContact, unlike entity fields)', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    const entityUrl = await createClientAndEntity(page);

    await page.request.post('/api/auth/logout');
    await loginViaApi(page, SEED_MANAGER_EMAIL);
    await page.goto(entityUrl);

    // A Manager can't edit the entity's own compliance fields...
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    // ...but can manage its contacts.
    await page.getByRole('button', { name: 'Add contact' }).click();
    const contactName = `E2E Manager Contact ${Date.now()}`;
    await page.getByLabel('Name').fill(contactName);
    await page.getByRole('button', { name: 'Add contact' }).click();
    const row = page.getByRole('row', { name: new RegExp(contactName) });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Remove' }).click();
    await expect(row).toHaveCount(0);
  });

  test('a Preparer cannot view entity contacts (no assignment mechanism yet)', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    const entityUrl = await createClientAndEntity(page);

    await page.request.post('/api/auth/logout');
    await loginViaApi(page, SEED_PREPARER_EMAIL);
    await page.goto(entityUrl);
    // Preparer has no client:viewAll, so the entity page itself 404s (see docs/RBAC.md) -
    // no Contacts section should ever render.
    await expect(page.getByRole('heading', { name: 'Contacts' })).toHaveCount(0);
  });
});
