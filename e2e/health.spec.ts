import { expect, test } from '@playwright/test';

test('home page loads and the health API responds ok', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('AI Operations OS');

  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});
