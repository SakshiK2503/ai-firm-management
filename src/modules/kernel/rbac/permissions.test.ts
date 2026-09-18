import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { isPermission, PERMISSION_CATALOG, roleHasPermission } from './permissions';

describe('permission catalog', () => {
  it('has no duplicate permission keys', () => {
    const keys = PERMISSION_CATALOG.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has no permission called auditLog:manage - the audit log is read-only for everyone', () => {
    const keys = PERMISSION_CATALOG.map((entry) => entry.key);
    expect(keys).not.toContain('auditLog:manage');
  });

  it('has no permission called task:delete - tasks are cancelled, never deleted', () => {
    const keys = PERMISSION_CATALOG.map((entry) => entry.key);
    expect(keys).not.toContain('task:delete');
    expect(keys).toContain('task:cancel');
  });

  it('isPermission recognizes catalog keys and rejects unknown strings', () => {
    expect(isPermission('task:view')).toBe(true);
    expect(isPermission('task:not-a-real-permission')).toBe(false);
  });
});

describe('roleHasPermission', () => {
  let organisationId: string;
  let managerRoleId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `RBAC Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    await db.permission.upsert({
      where: { key: 'task:reassign' },
      update: {},
      create: { key: 'task:reassign', description: 'Reassign a task' },
    });

    const managerRole = await db.role.create({
      data: { organisationId, name: 'Manager' },
    });
    managerRoleId = managerRole.id;

    await db.rolePermission.create({
      data: { organisationId, roleId: managerRoleId, permissionKey: 'task:reassign' },
    });
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('returns true for a granted permission', async () => {
    expect(await roleHasPermission(managerRoleId, 'task:reassign')).toBe(true);
  });

  it('returns false for a permission that was never granted', async () => {
    expect(await roleHasPermission(managerRoleId, 'organisation:manage')).toBe(false);
  });
});
