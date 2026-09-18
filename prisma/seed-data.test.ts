import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { seedDatabase } from './seed-data';

describe('seedDatabase', () => {
  afterAll(async () => {
    await db.organisation.deleteMany({ where: { id: 'seed-org' } });
    await db.$disconnect();
  });

  it('seeds an organisation with departments, roles, and an owner user', async () => {
    const result = await seedDatabase();

    expect(result.organisation.name).toBe('Zelox & Co');
    expect(result.departments).toHaveLength(3);
    expect(result.roles).toHaveLength(3);
    expect(result.owner.email).toBe('owner@zelox.in');
  });

  it('is idempotent: running it again does not create duplicates or throw', async () => {
    await seedDatabase();
    await seedDatabase();

    const departmentCount = await db.department.count({
      where: { organisationId: 'seed-org' },
    });
    const userCount = await db.user.count({ where: { organisationId: 'seed-org' } });

    expect(departmentCount).toBe(3);
    expect(userCount).toBe(1);
  });

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
