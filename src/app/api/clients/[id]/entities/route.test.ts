import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/clients/[id]/entities', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let managerSessionId: string;
  let preparerSessionId: string;
  let clientId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Entities Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['client:view', 'client:viewAll', 'client:editStructural']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: partnerRole.id, permissionKey: 'client:view' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'client:viewAll' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'client:editStructural' },
      ],
    });
    const managerRole = await db.role.create({ data: { organisationId, name: 'Manager' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: managerRole.id, permissionKey: 'client:view' },
        { organisationId, roleId: managerRole.id, permissionKey: 'client:viewAll' },
      ],
    });
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: preparerRole.id, permissionKey: 'client:view' },
    });

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

    clientId = (await db.client.create({ data: { organisationId, name: 'Subject Client' } })).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(id: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/clients/${id}/entities`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function post(id: string, body: unknown, sessionId?: string) {
    return POST(
      new NextRequest(`http://localhost/api/clients/${id}/entities`, {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('returns an empty list for a client with no entities', async () => {
    const response = await get(clientId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entities).toEqual([]);
  });

  it('creates an entity as a Partner', async () => {
    const response = await post(clientId, { name: 'ABC Private Limited' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.entity.name).toBe('ABC Private Limited');
  });

  it('rejects a malformed PAN with a validation error', async () => {
    const response = await post(
      clientId,
      { name: 'Bad PAN Co', pan: 'not-a-pan' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_PAN');
  });

  it('returns 403 creating an entity as a Manager (no editStructural)', async () => {
    const response = await post(clientId, { name: 'Should Not Exist' }, managerSessionId);
    expect(response.status).toBe(403);
  });

  it('lists entities as a Manager (viewAll)', async () => {
    const response = await get(clientId, managerSessionId);
    expect(response.status).toBe(200);
  });

  it('returns 404 listing entities as a Preparer (no assignment mechanism yet)', async () => {
    const response = await get(clientId, preparerSessionId);
    expect(response.status).toBe(404);
  });

  it('returns 401 without a session', async () => {
    const response = await get(clientId);
    expect(response.status).toBe(401);
  });
});
