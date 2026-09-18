import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, PATCH } from './route';

describe('/api/employees/[id]', () => {
  let organisationId: string;
  let departmentId: string;
  let disabledDepartmentId: string;
  let roleId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let employeeId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Employee Patch Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;
    departmentId = (await db.department.create({ data: { organisationId, name: 'Accounts' } })).id;
    disabledDepartmentId = (
      await db.department.create({ data: { organisationId, name: 'Legacy', isActive: false } })
    ).id;
    roleId = (await db.role.create({ data: { organisationId, name: 'AssignedRole' } })).id;

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
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });

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

    employeeId = (
      await db.user.create({
        data: {
          organisationId,
          email: `subject-${crypto.randomUUID()}@example.com`,
          name: 'Subject Employee',
          passwordHash,
          departmentId,
          roleId,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(id: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/employees/${id}`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function patch(id: string, body: unknown, sessionId?: string) {
    return PATCH(
      new NextRequest(`http://localhost/api/employees/${id}`, {
        method: 'PATCH',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('gets employee detail as a Partner', async () => {
    const response = await get(employeeId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.employee.name).toBe('Subject Employee');
    expect(body.employee.department.name).toBe('Accounts');
  });

  it('returns 404 for an employee that does not exist', async () => {
    const response = await get('00000000-0000-0000-0000-000000000000', partnerSessionId);
    expect(response.status).toBe(404);
  });

  it('renames and toggles status as a Partner', async () => {
    const response = await patch(
      employeeId,
      { name: 'Renamed Employee', isActive: false },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.employee.name).toBe('Renamed Employee');
    expect(body.employee.isActive).toBe(false);
  });

  it('rejects moving an employee to a disabled department', async () => {
    const response = await patch(
      employeeId,
      { departmentId: disabledDepartmentId },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('DEPARTMENT_DISABLED');
  });

  it('returns 403 patching as a Preparer', async () => {
    const response = await patch(employeeId, { isActive: true }, preparerSessionId);
    expect(response.status).toBe(403);
  });
});
