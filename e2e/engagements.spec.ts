import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL } from './helpers';

test.describe('client-service engagements', () => {
  test('Partner can engage a service for an entity, then terminate and reactivate it', async ({
    page,
  }) => {
    // This flow does more hosted-DB round trips (service, client, entity, then the engagement
    // itself) than a typical single-resource spec - the default 30s test timeout can be too
    // tight against Supabase latency even when nothing is wrong (see playwright.config.ts's own
    // comment on this).
    test.setTimeout(60_000);
    await loginViaApi(page, SEED_OWNER_EMAIL);

    const serviceName = `E2E Engagement Service ${Date.now()}`;
    await page.goto('/services');
    await page.getByLabel('Service name').fill(serviceName);
    await page.getByRole('button', { name: 'Add service' }).click();
    await expect(page.getByRole('link', { name: serviceName, exact: true })).toBeVisible();

    await page.goto('/clients');
    const clientName = `E2E Engagement Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();

    await page.getByRole('button', { name: 'Add legal entity' }).click();
    const entityName = `E2E Engagement Entity ${Date.now()}`;
    await page.getByLabel('Entity name').fill(entityName);
    await page.getByRole('button', { name: 'Add entity' }).click();
    await page.getByRole('link', { name: entityName, exact: true }).click();
    await expect(page.getByRole('heading', { name: entityName, exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add engagement' }).click();
    await page.getByLabel('Service').selectOption({ label: serviceName });
    await page.getByLabel('Engagement start').fill('2026-04-01');
    await page.getByLabel('Billing structure').selectOption('ASSIGNMENT');
    await page.getByRole('button', { name: 'Add engagement', exact: true }).click();

    const engagementRow = page.getByRole('row', { name: new RegExp(serviceName) });
    await expect(engagementRow).toBeVisible();
    await expect(engagementRow.getByText('Assignment')).toBeVisible();
    await expect(engagementRow.getByText('Active', { exact: true })).toBeVisible();

    await engagementRow.getByRole('button', { name: 'Terminate' }).click();
    await expect(engagementRow.getByText('Terminated')).toBeVisible();

    await engagementRow.getByRole('button', { name: 'Reactivate' }).click();
    await expect(engagementRow.getByText('Active', { exact: true })).toBeVisible();
  });

  test('a disabled service cannot be newly engaged', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);

    const serviceName = `E2E Disabled Engagement Service ${Date.now()}`;
    await page.goto('/services');
    await page.getByLabel('Service name').fill(serviceName);
    await page.getByRole('button', { name: 'Add service' }).click();
    const serviceRow = page.getByRole('row', { name: new RegExp(serviceName) });
    await serviceRow.getByRole('button', { name: 'Disable' }).click();
    await expect(serviceRow.getByText('Disabled')).toBeVisible();

    await page.goto('/clients');
    const clientName = `E2E Disabled Service Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();

    await page.getByRole('button', { name: 'Add legal entity' }).click();
    const entityName = `E2E Disabled Service Entity ${Date.now()}`;
    await page.getByLabel('Entity name').fill(entityName);
    await page.getByRole('button', { name: 'Add entity' }).click();
    await page.getByRole('link', { name: entityName, exact: true }).click();
    await expect(page.getByRole('heading', { name: entityName, exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add engagement' }).click();
    // A disabled service should not even be a selectable option to begin with, since the
    // create form only lists active services (Day 39's "disabled service cannot be newly
    // assigned" enforced at the UI layer, not just the API).
    await expect(
      page.getByLabel('Service').locator('option', { hasText: serviceName }),
    ).toHaveCount(0);
  });

  test('a Manager can view engagements but not add one', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);

    await page.goto('/clients');
    const clientName = `E2E Manager Engagement Client ${Date.now()}`;
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();

    await page.getByRole('button', { name: 'Add legal entity' }).click();
    const entityName = `E2E Manager Engagement Entity ${Date.now()}`;
    await page.getByLabel('Entity name').fill(entityName);
    await page.getByRole('button', { name: 'Add entity' }).click();
    await page.getByRole('link', { name: entityName, exact: true }).click();
    await expect(page.getByRole('heading', { name: entityName, exact: true })).toBeVisible();
    const entityUrl = page.url();

    await page.request.post('/api/auth/logout');
    await loginViaApi(page, SEED_MANAGER_EMAIL);
    await page.goto(entityUrl);
    await expect(page.getByRole('heading', { name: 'Engagements' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add engagement' })).toHaveCount(0);
  });
});
