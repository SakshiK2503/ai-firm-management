import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL, SEED_PREPARER_EMAIL } from './helpers';

test.describe('skills admin', () => {
  test('Partner can create a skill, assign it to an employee, and remove it', async ({ page }) => {
    await loginViaApi(page, SEED_OWNER_EMAIL);
    await page.goto('/skills');

    const skillName = `E2E Skill ${Date.now()}`;
    await page.getByLabel('New skill name').fill(skillName);
    await page.getByRole('button', { name: 'Add skill' }).click();
    await expect(page.getByText(skillName)).toBeVisible();

    // Assign it to an employee from the Employees admin page.
    await page.goto('/employees');
    const employeeName = `E2E Skill Employee ${Date.now()}`;
    await page.getByLabel('Full name').fill(employeeName);
    await page.getByLabel('Email').fill(`e2e-skill-employee-${Date.now()}@example.com`);
    await page.getByLabel('Temporary password').fill('a-strong-password');
    await page.getByRole('button', { name: 'Add employee' }).click();
    await page.getByRole('link', { name: employeeName, exact: true }).click();

    await page.getByLabel('Skill').selectOption({ label: skillName });
    await page.getByLabel('Level').selectOption('ADVANCED');
    await page.getByRole('button', { name: 'Add skill' }).click();

    const skillRow = page.getByRole('row', { name: new RegExp(`${skillName}.*ADVANCED`) });
    await expect(skillRow).toBeVisible();

    // The skill catalogue should now show this employee counted against it.
    await page.goto('/skills');
    const catalogueRow = page.getByRole('row', { name: new RegExp(skillName) });
    await expect(catalogueRow.getByRole('cell', { name: '1', exact: true })).toBeVisible();

    // Remove the assignment from the employee's page.
    await page.goto('/employees');
    await page.getByRole('link', { name: employeeName, exact: true }).click();
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('No skills assigned yet.')).toBeVisible();
  });

  test('a Manager can view skills but not create them', async ({ page }) => {
    await loginViaApi(page, SEED_MANAGER_EMAIL);
    await page.goto('/skills');
    await expect(page.getByRole('heading', { name: 'Skills' })).toBeVisible();
    await expect(page.getByLabel('New skill name')).toHaveCount(0);
  });

  test('a Preparer sees no Skills nav link and cannot view the page directly', async ({ page }) => {
    await loginViaApi(page, SEED_PREPARER_EMAIL);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Skills' })).toHaveCount(0);

    await page.goto('/skills');
    await expect(page.getByText("You don't have permission to view this page.")).toBeVisible();
  });
});
