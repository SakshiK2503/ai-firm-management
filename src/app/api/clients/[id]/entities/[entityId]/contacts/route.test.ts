import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/clients/[id]/entities/[entityId]/contacts', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let managerSessionId: string;
  let preparerSessionId: string;
  let clientId: string;
  let entityId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Contacts Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['client:view', 'client:viewAll', 'client:editContact']) {
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
        { organisationId, roleId: partnerRole.id, permissionKey: 'client:editContact' },
      ],
    });
    // Manager also gets editContact (unlike editStructural) - contacts are lightweight,
    // day-to-day data per RBAC.md, not gated the same way as an entity's compliance fields.
    const managerRole = await db.role.create({ data: { organisationId, name: 'Manager' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: managerRole.id, permissionKey: 'client:view' },
        { organisationId, roleId: managerRole.id, permissionKey: 'client:viewAll' },
        { organisationId, roleId: managerRole.id, permissionKey: 'client:editContact' },
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
    entityId = (
      await db.clientEntity.create({ data: { organisationId, clientId, name: 'Subject Entity' } })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(cId: string, eId: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/clients/${cId}/entities/${eId}/contacts`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id: cId, entityId: eId }) },
    );
  }

  function post(cId: string, eId: string, body: unknown, sessionId?: string) {
    return POST(
      new NextRequest(`http://localhost/api/clients/${cId}/entities/${eId}/contacts`, {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: cId, entityId: eId }) },
    );
  }

  it('returns an empty list for an entity with no contacts', async () => {
    const response = await get(clientId, entityId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contacts).toEqual([]);
  });

  it('creates a contact as a Manager (editContact, unlike editStructural)', async () => {
    const response = await post(
      clientId,
      entityId,
      { name: 'Rahul Sharma', designation: 'Director' },
      managerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.contact.name).toBe('Rahul Sharma');
  });

  it('rejects an invalid email with a validation error', async () => {
    const response = await post(
      clientId,
      entityId,
      { name: 'Bad Email Contact', email: 'not-an-email' },
      partnerSessionId,
    );
    expect(response.status).toBe(400);
  });

  it('returns 403 creating a contact as a Preparer', async () => {
    const response = await post(
      clientId,
      entityId,
      { name: 'Should Not Exist' },
      preparerSessionId,
    );
    expect(response.status).toBe(403);
  });

  it('returns 404 listing contacts as a Preparer (no assignment mechanism yet)', async () => {
    const response = await get(clientId, entityId, preparerSessionId);
    expect(response.status).toBe(404);
  });

  it('returns 401 without a session', async () => {
    const response = await get(clientId, entityId);
    expect(response.status).toBe(401);
  });
});
