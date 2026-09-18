import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/departments', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Departments Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    await db.permission.upsert({
      where: { key: 'department:view' },
      update: {},
      create: { key: 'department:view', description: 'View departments' },
    });
    await db.permission.upsert({
      where: { key: 'department:manage' },
      update: {},
      create: { key: 'department:manage', description: 'Manage departments' },
    });

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: partnerRole.id, permissionKey: 'department:view' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'department:manage' },
      ],
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
      new NextRequest('http://localhost/api/departments', {
        method: 'POST',
        headers: {
          ...(sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : {}),
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
  }

  it('creates a department as a Partner', async () => {
    const response = await post({ name: 'Accounts' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.department.name).toBe('Accounts');
  });

  it('rejects an empty name with a validation error', async () => {
    const response = await post({ name: '' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate name with 409', async () => {
    await post({ name: 'Audit' }, partnerSessionId);
    const response = await post({ name: 'Audit' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('returns 403 creating a department as a Preparer', async () => {
    const response = await post({ name: 'Should Not Exist' }, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 creating a department while logged out', async () => {
    const response = await post({ name: 'Should Not Exist' });
    expect(response.status).toBe(401);
  });

  it('lists departments and supports search as a Partner', async () => {
    await post({ name: 'Digital Marketing' }, partnerSessionId);

    const listResponse = await get('http://localhost/api/departments', partnerSessionId);
    const listBody = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listBody.departments.some((d: { name: string }) => d.name === 'Digital Marketing')).toBe(
      true,
    );

    const searchResponse = await get(
      'http://localhost/api/departments?search=digital',
      partnerSessionId,
    );
    const searchBody = await searchResponse.json();
    expect(searchBody.departments).toHaveLength(1);
    expect(searchBody.departments[0].name).toBe('Digital Marketing');
  });

  it('returns 403 listing departments as a Preparer', async () => {
    const response = await get('http://localhost/api/departments', preparerSessionId);
    expect(response.status).toBe(403);
  });
});
