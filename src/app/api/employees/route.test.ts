import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/employees', () => {
  let organisationId: string;
  let departmentId: string;
  let roleId: string;
  let partnerSessionId: string;
  let managerSessionId: string;
  let preparerSessionId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Employees Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;
    departmentId = (await db.department.create({ data: { organisationId, name: 'Accounts' } })).id;
    roleId = (await db.role.create({ data: { organisationId, name: 'Preparer' } })).id;

    for (const key of ['employee:view', 'employee:manage']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: partnerRole.id, permissionKey: 'employee:view' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'employee:manage' },
      ],
    });
    const managerRole = await db.role.create({ data: { organisationId, name: 'Manager' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: managerRole.id, permissionKey: 'employee:view' },
    });
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer Role' } });

    const passwordHash = await hashPassword('irrelevant');
    const future = new Date(Date.now() + 60_000);

    const partnerUser = await db.user.create({
      data: {
        organisationId,
        email: `partner-${crypto.randomUUID()}@example.com`,
        name: 'Partner User',
        passwordHash,
        roleId: partnerRole.id,
      },
    });
    partnerSessionId = (
      await db.session.create({
        data: { organisationId, userId: partnerUser.id, expiresAt: future },
      })
    ).id;

    const managerUser = await db.user.create({
      data: {
        organisationId,
        email: `manager-${crypto.randomUUID()}@example.com`,
        name: 'Manager User',
        passwordHash,
        roleId: managerRole.id,
      },
    });
    managerSessionId = (
      await db.session.create({
        data: { organisationId, userId: managerUser.id, expiresAt: future },
      })
    ).id;

    const preparerUser = await db.user.create({
      data: {
        organisationId,
        email: `preparer-${crypto.randomUUID()}@example.com`,
        name: 'Preparer User',
        passwordHash,
        roleId: preparerRole.id,
      },
    });
    preparerSessionId = (
      await db.session.create({
        data: { organisationId, userId: preparerUser.id, expiresAt: future },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(url: string, sessionId?: string) {
    return GET(
      new NextRequest(url, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
    );
  }

  function post(body: unknown, sessionId?: string) {
    return POST(
      new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
    );
  }

  it('creates an employee as a Partner', async () => {
    const response = await post(
      {
        email: `new-${crypto.randomUUID()}@example.com`,
        name: 'New Employee',
        password: 'a-strong-password',
        departmentId,
        roleId,
      },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.employee.name).toBe('New Employee');
  });

  it('rejects an invalid email with a validation error', async () => {
    const response = await post(
      {
        email: 'not-an-email',
        name: 'New Employee',
        password: 'a-strong-password',
        departmentId,
        roleId,
      },
      partnerSessionId,
    );
    expect(response.status).toBe(400);
  });

  it('returns 403 creating an employee as a Manager (view-only)', async () => {
    const response = await post(
      {
        email: `denied-${crypto.randomUUID()}@example.com`,
        name: 'Should Not Exist',
        password: 'a-strong-password',
        departmentId,
        roleId,
      },
      managerSessionId,
    );
    expect(response.status).toBe(403);
  });

  it('lists employees as a Manager (view permission)', async () => {
    const response = await get('http://localhost/api/employees', managerSessionId);
    expect(response.status).toBe(200);
  });

  it('returns 403 listing employees as a Preparer', async () => {
    const response = await get('http://localhost/api/employees', preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 without a session', async () => {
    const response = await get('http://localhost/api/employees');
    expect(response.status).toBe(401);
  });
});
