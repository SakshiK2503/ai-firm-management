import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import {
  SEED_MANAGER_EMAIL,
  SEED_OWNER_EMAIL,
  SEED_PREPARER_EMAIL,
  seedDatabase,
} from './seed-data';

describe('seedDatabase', () => {
  // No cleanup of 'seed-org' here, deliberately: it's the same real organisation the running
  // app, E2E tests, and the founder's manual testing all depend on - seedDatabase() is
  // idempotent by design specifically so this test (and any other caller) can run it freely
  // without ever needing to tear it down. Deleting it here previously wiped every real seed
  // user (owner/manager/preparer) each time `npm run test` ran, which had been quietly breaking
  // login for anyone testing right after a test run.
  afterAll(async () => {
    await db.$disconnect();
  });

  it('seeds an organisation with departments, roles, and sample users for each role', async () => {
    const result = await seedDatabase();

    expect(result.organisation.name).toBe('Zelox & Co');
    expect(result.departments).toHaveLength(3);
    expect(result.roles).toHaveLength(3);
    expect(result.users).toHaveLength(3);
    expect(result.owner.email).toBe('owner@zelox.in');
  });

  it('is idempotent: running it again does not create duplicate seed rows', async () => {
    await seedDatabase();
    await seedDatabase();

    // Count each seeded row by its own name/email, not the organisation's total - 'seed-org'
    // is the same org a human might be manually testing the running app against (creating
    // their own departments/employees through the UI), so a DB-wide count isn't a reliable
    // idempotency check. What idempotent actually means here: seedDatabase's own rows never
    // duplicate, regardless of what else exists in the org.
    for (const name of ['Accounts', 'Tax', 'Audit']) {
      const count = await db.department.count({ where: { organisationId: 'seed-org', name } });
      expect(count).toBe(1);
    }
    for (const email of [SEED_OWNER_EMAIL, SEED_MANAGER_EMAIL, SEED_PREPARER_EMAIL]) {
      const count = await db.user.count({ where: { organisationId: 'seed-org', email } });
      expect(count).toBe(1);
    }
  }, 15_000);

  it('seeds the RBAC grants so the owner (Partner) can manage the organisation but a fresh Preparer role cannot', async () => {
    const result = await seedDatabase();
    const partnerRole = result.roles.find((role) => role.name === 'Partner');
    const preparerRole = result.roles.find((role) => role.name === 'Preparer');
    if (!partnerRole || !preparerRole) throw new Error('Expected seeded Partner/Preparer roles');

    expect(await roleHasPermission(partnerRole.id, 'organisation:manage')).toBe(true);
    expect(await roleHasPermission(preparerRole.id, 'organisation:manage')).toBe(false);
    expect(await roleHasPermission(preparerRole.id, 'task:view')).toBe(true);
  });
});
