import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_OWNER_EMAIL } from './helpers';

test.describe('employee availability', () => {
  test('Partner can record leave, sees an overlap rejected, and can delete a record', async ({
    page,
  }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/employees');

    const employeeName = `E2E Availability Employee ${Date.now()}`;
    await page.getByLabel('Full name').fill(employeeName);
    await page.getByLabel('Email').fill(`e2e-availability-${Date.now()}@example.com`);
    await page.getByLabel('Temporary password').fill('a-strong-password');
    await page.getByRole('button', { name: 'Add employee' }).click();
    await page.getByRole('link', { name: employeeName, exact: true }).click();

    await page.getByLabel('Type').selectOption('LEAVE');
    await page.getByLabel('Start date').fill('2026-12-01');
    await page.getByLabel('End date').fill('2026-12-05');
    await page.getByLabel('Reason').fill('E2E test leave');
    await page.getByRole('button', { name: 'Add record' }).click();

    await expect(page.getByText('E2E test leave')).toBeVisible();

    // Overlapping period should be rejected with a clear message.
    await page.getByLabel('Type').selectOption('SICK');
    await page.getByLabel('Start date').fill('2026-12-03');
    await page.getByLabel('End date').fill('2026-12-04');
    await page.getByRole('button', { name: 'Add record' }).click();
    await expect(
      page.getByText('This period overlaps an existing availability record for this employee.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('No leave or unavailability recorded.')).toBeVisible();
  });
});
