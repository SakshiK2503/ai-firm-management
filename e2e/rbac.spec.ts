import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_MANAGER_EMAIL, SEED_OWNER_EMAIL } from './helpers';

test('a Partner can view organisation settings but a Manager cannot', async ({ page }) => {
  await loginViaApi(page, SEED_OWNER_EMAIL);
  const partnerResponse = await page.request.get('/api/organisation');
  expect(partnerResponse.status()).toBe(200);

  await page.request.post('/api/auth/logout');
  await loginViaApi(page, SEED_MANAGER_EMAIL);
  const managerResponse = await page.request.get('/api/organisation');
  expect(managerResponse.status()).toBe(403);
  expect((await managerResponse.json()).error.code).toBe('FORBIDDEN');
});
