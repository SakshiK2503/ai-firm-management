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

    await taskRow.getByRole('link', { name: /^TASK-\d{4}-\d{2}-\d{6}$/ }).click();
    await expect(page.getByRole('heading', { name: taskTitle, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: clientName, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: entityName, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: serviceName, exact: true })).toBeVisible();
    await expect(page.getByText('HIGH')).toBeVisible();
    await expect(page.getByText('NEW')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Engagement' })).toBeVisible();
    await expect(page.getByText('MONTHLY')).toBeVisible();
  });

  test('a Preparer with nothing assigned to them sees the Tasks nav link but no tasks and no create form', async ({
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

test.describe('task status workflow', () => {
  test('Partner can move a task through several workflow transitions from the detail page', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await loginViaApi(page, SEED_OWNER_EMAIL);

    const serviceName = `E2E Workflow Service ${Date.now()}`;
    await page.goto('/services');
    await page.getByLabel('Service name').fill(serviceName);
    await page.getByRole('button', { name: 'Add service' }).click();
    await expect(page.getByRole('link', { name: serviceName, exact: true })).toBeVisible();

    const clientName = `E2E Workflow Client ${Date.now()}`;
    await page.goto('/clients');
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();

    await page.getByRole('button', { name: 'Add legal entity' }).click();
    const entityName = `E2E Workflow Entity ${Date.now()}`;
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
    const taskTitle = `E2E Workflow Task ${Date.now()}`;
    await page.getByLabel('Task title').fill(taskTitle);
    await page.getByRole('button', { name: 'Create task' }).click();
    const taskRow = page.getByRole('row', { name: new RegExp(taskTitle) });
    await expect(taskRow).toBeVisible();
    await taskRow.getByRole('link', { name: /^TASK-\d{4}-\d{2}-\d{6}$/ }).click();
    await expect(page.getByRole('heading', { name: taskTitle, exact: true })).toBeVisible();

    await expect(page.getByText('Status: NEW')).toBeVisible();
    // From NEW, a manual task can only go to AI_PROCESSING or AWAITING_ALLOCATION (plus
    // CANCELLED) - it should never offer a status it can't legally reach next, like ASSIGNED.
    await expect(page.getByRole('button', { name: 'Move to ASSIGNED' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Move to AWAITING_ALLOCATION' }).click();
    await expect(page.getByText('Status: AWAITING_ALLOCATION')).toBeVisible();

    await page.getByRole('button', { name: 'Move to ASSIGNED' }).click();
    await expect(page.getByText('Status: ASSIGNED')).toBeVisible();

    await page.getByRole('button', { name: 'Move to IN_PROGRESS' }).click();
    await expect(page.getByText('Status: IN_PROGRESS')).toBeVisible();

    await page.getByRole('button', { name: 'Move to SUBMITTED_FOR_REVIEW' }).click();
    await expect(page.getByText('Status: SUBMITTED_FOR_REVIEW')).toBeVisible();

    // The Owner/Partner also holds task:review, so the reviewer-only transition is offered too.
    await page.getByRole('button', { name: 'Move to REVIEW_IN_PROGRESS' }).click();
    await expect(page.getByText('Status: REVIEW_IN_PROGRESS')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move to APPROVED' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move to CORRECTION_REQUIRED' })).toBeVisible();
  });
});

test.describe('task assignment', () => {
  test('Partner can assign an eligible employee once a task is awaiting allocation', async ({
    page,
  }) => {
    // Heavier than the other multi-step task specs (adds an employee-creation step on top of
    // service/client/entity/engagement/task/status-transition), and the assign endpoint itself
    // can be slow on a first hit - see playwright.config.ts's own comment on hosted-DB latency.
    test.setTimeout(90_000);
    await loginViaApi(page, SEED_OWNER_EMAIL);

    const employeeName = `E2E Assignment Employee ${Date.now()}`;
    await page.goto('/employees');
    await page.getByLabel('Full name').fill(employeeName);
    await page.getByLabel('Email').fill(`e2e-assignment-${Date.now()}@example.com`);
    await page.getByLabel('Temporary password').fill('a-strong-password');
    await page.getByRole('button', { name: 'Add employee' }).click();
    await expect(page.getByRole('link', { name: employeeName, exact: true })).toBeVisible();

    const serviceName = `E2E Assignment Service ${Date.now()}`;
    await page.goto('/services');
    await page.getByLabel('Service name').fill(serviceName);
    await page.getByRole('button', { name: 'Add service' }).click();
    await expect(page.getByRole('link', { name: serviceName, exact: true })).toBeVisible();

    const clientName = `E2E Assignment Client ${Date.now()}`;
    await page.goto('/clients');
    await page.getByLabel('New client name').fill(clientName);
    await page.getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('link', { name: clientName, exact: true }).click();

    await page.getByRole('button', { name: 'Add legal entity' }).click();
    const entityName = `E2E Assignment Entity ${Date.now()}`;
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
    const taskTitle = `E2E Assignment Task ${Date.now()}`;
    await page.getByLabel('Task title').fill(taskTitle);
    await page.getByRole('button', { name: 'Create task' }).click();
    const taskRow = page.getByRole('row', { name: new RegExp(taskTitle) });
    await expect(taskRow).toBeVisible();
    await taskRow.getByRole('link', { name: /^TASK-\d{4}-\d{2}-\d{6}$/ }).click();
    await expect(page.getByRole('heading', { name: taskTitle, exact: true })).toBeVisible();

    await expect(page.getByText('Assigned to: Unassigned')).toBeVisible();

    await page.getByRole('button', { name: 'Move to AWAITING_ALLOCATION' }).click();
    await expect(page.getByText('Status: AWAITING_ALLOCATION')).toBeVisible();

    await page.getByLabel('Assign to employee').selectOption({ label: employeeName });
    await page.getByRole('button', { name: 'Assign', exact: true }).click();

    await expect(page.getByText(`Assigned to: ${employeeName}`)).toBeVisible();
    await expect(page.getByText('Status: ASSIGNED')).toBeVisible();
  });
});
