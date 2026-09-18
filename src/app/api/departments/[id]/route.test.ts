import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { PATCH } from './route';

describe('PATCH /api/departments/[id]', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let departmentId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Department Patch Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    await db.permission.upsert({
      where: { key: 'department:manage' },
      update: {},
      create: { key: 'department:manage', description: 'Manage departments' },
    });

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: partnerRole.id, permissionKey: 'department:manage' },
    });
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });

    const passwordHash = await hashPassword('irrelevant');
    const partnerUser = await db.user.create({
      data: {
        organisationId,
        email: `partner-${crypto.randomUUID()}@example.com`,
        name: 'Partner User',
        passwordHash,
        roleId: partnerRole.id,
      },
    });
    const preparerUser = await db.user.create({
      data: {
        organisationId,
        email: `preparer-${crypto.randomUUID()}@example.com`,
        name: 'Preparer User',
        passwordHash,
        roleId: preparerRole.id,
      },
    });

    const future = new Date(Date.now() + 60_000);
    partnerSessionId = (
      await db.session.create({
        data: { organisationId, userId: partnerUser.id, expiresAt: future },
      })
    ).id;
    preparerSessionId = (
      await db.session.create({
        data: { organisationId, userId: preparerUser.id, expiresAt: future },
      })
    ).id;

    departmentId = (await db.department.create({ data: { organisationId, name: 'Original Name' } }))
      .id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function patch(id: string, body: unknown, sessionId?: string) {
    return PATCH(
      new NextRequest(`http://localhost/api/departments/${id}`, {
        method: 'PATCH',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('disables a department as a Partner', async () => {
    const response = await patch(departmentId, { isActive: false }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.department.isActive).toBe(false);
  });

  it('renames a department as a Partner', async () => {
    const response = await patch(departmentId, { name: 'Renamed' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.department.name).toBe('Renamed');
  });

  it('returns 400 for an empty update body', async () => {
    const response = await patch(departmentId, {}, partnerSessionId);
    expect(response.status).toBe(400);
  });

  it('returns 404 for a department that does not exist', async () => {
    const response = await patch(
      '00000000-0000-0000-0000-000000000000',
      { isActive: false },
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 as a Preparer', async () => {
    const response = await patch(departmentId, { isActive: false }, preparerSessionId);
    expect(response.status).toBe(403);
  });
});
