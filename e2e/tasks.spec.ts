import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

test.describe('task creation', () => {
  test('Partner can create a task against an engaged client/entity/service', async ({ page }) => {
    test.setTimeout(60_000);
    await loginViaApi(page, SEED_OWNER_EMAIL);

    const serviceName = `E2E Task Service ${Date.now()}`;
    await page.goto('/services');
    await page.getByLabel('Service name').fill(serviceName);
    await page.getByRole('button', { name: 'Add service' }).click();
    await expect(page.getByRole('link', { name: serviceName, exact: true })).toBeVisible();

    const clientName = `E2E Task Client ${Date.now()}`;
    await page.goto('/clients');
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();

    await page.getByRole('button', { name: 'Add legal entity' }).click();
    const entityName = `E2E Task Entity ${Date.now()}`;
    await page.getByLabel('Entity name').fill(entityName);
    await page.getByRole('button', { name: 'Add entity' }).click();
    await page.getByRole('link', { name: entityName, exact: true }).click();
    await expect(page.getByRole('heading', { name: entityName, exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add engagement' }).click();
    await page.getByLabel('Service').selectOption({ label: serviceName });
    await page.getByLabel('Engagement start').fill('2026-04-01');
    await page.getByRole('button', { name: 'Add engagement', exact: true }).click();
    await expect(page.getByRole('row', { name: new RegExp(serviceName) })).toBeVisible();

    await page.goto('/tasks');
    await page.getByLabel('Client', { exact: true }).selectOption({ label: clientName });
    await page.getByLabel('Entity').selectOption({ label: entityName });
    await page.getByLabel('Task service').selectOption({ label: serviceName });
    const taskTitle = `E2E Task Title ${Date.now()}`;
    await page.getByLabel('Task title').fill(taskTitle);
    await page.getByLabel('Task priority').selectOption('HIGH');
    await page.getByRole('button', { name: 'Create task' }).click();

    const taskRow = page.getByRole('row', { name: new RegExp(taskTitle) });
    await expect(taskRow).toBeVisible();
    await expect(taskRow.getByText(/^TASK-\d{4}-\d{2}-\d{6}$/)).toBeVisible();
    await expect(taskRow.getByText(clientName)).toBeVisible();
    await expect(taskRow.getByText(entityName)).toBeVisible();
    await expect(taskRow.getByText('HIGH')).toBeVisible();
    await expect(taskRow.getByText('NEW')).toBeVisible();

    // Filtering by a priority the new task doesn't have should hide it; filtering by its own
    // client should keep it visible; clearing filters brings it back either way.
    await page.getByLabel('Filter by priority').selectOption('LOW');
    await expect(page.getByRole('row', { name: new RegExp(taskTitle) })).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('row', { name: new RegExp(taskTitle) })).toBeVisible();

    await page.getByLabel('Filter by client').selectOption({ label: clientName });
    await expect(page.getByRole('row', { name: new RegExp(taskTitle) })).toBeVisible();
  });

  test('a Preparer sees the Tasks nav link but no tasks and no create form (no assignment mechanism yet)', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_PREPARER_EMAIL);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible();

    await page.goto('/tasks');
    await expect(page.getByText('No tasks found.')).toBeVisible();
    await expect(page.getByLabel('Task title')).toHaveCount(0);
  });
});
