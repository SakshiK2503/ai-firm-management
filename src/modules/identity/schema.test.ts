import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';

describe('identity core schema', () => {
  let organisationId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('creates and reads a department scoped to the organisation', async () => {
    const department = await db.department.create({
      data: { organisationId, name: 'Accounts' },
    });

    const found = await db.department.findUniqueOrThrow({ where: { id: department.id } });
    expect(found.organisationId).toBe(organisationId);
    expect(found.isActive).toBe(true);
  });

  it('creates and reads a role scoped to the organisation', async () => {
    const role = await db.role.create({ data: { organisationId, name: 'Preparer' } });

    const found = await db.role.findUniqueOrThrow({ where: { id: role.id } });
    expect(found.organisationId).toBe(organisationId);
  });

  it('creates a user with a department and role, and reads it back with relations', async () => {
    const department = await db.department.create({
      data: { organisationId, name: 'Tax' },
    });
    const role = await db.role.create({ data: { organisationId, name: 'Reviewer' } });

    const user = await db.user.create({
      data: {
        organisationId,
        email: `user-${crypto.randomUUID()}@example.com`,
        name: 'Test User',
        departmentId: department.id,
        roleId: role.id,
      },
    });

    const found = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { department: true, role: true, organisation: true },
    });

    expect(found.organisation.id).toBe(organisationId);
    expect(found.department?.name).toBe('Tax');
    expect(found.role?.name).toBe('Reviewer');
  });

  it('rejects a duplicate department name within the same organisation', async () => {
    await db.department.create({ data: { organisationId, name: 'Audit' } });

    await expect(
      db.department.create({ data: { organisationId, name: 'Audit' } }),
    ).rejects.toThrow();
  });

  it('deleting the organisation cascades to its departments, roles and users', async () => {
    const organisation = await db.organisation.create({
      data: { name: `Cascade Org ${crypto.randomUUID()}` },
    });
    const department = await db.department.create({
      data: { organisationId: organisation.id, name: 'Cascade Dept' },
    });

    await db.organisation.delete({ where: { id: organisation.id } });

    const found = await db.department.findUnique({ where: { id: department.id } });
    expect(found).toBeNull();
  });
});
