import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { PATCH, DELETE } from './route';

describe('/api/clients/[id]/entities/[entityId]/contacts/[contactId]', () => {
  let organisationId: string;
  let managerSessionId: string;
  let preparerSessionId: string;
  let clientId: string;
  let entityId: string;
  let contactId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Contact Patch Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['client:view', 'client:viewAll', 'client:editContact']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

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
    contactId = (
      await db.contact.create({ data: { organisationId, entityId, name: 'Subject Contact' } })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function patch(cId: string, eId: string, ctId: string, body: unknown, sessionId?: string) {
    return PATCH(
      new NextRequest(`http://localhost/api/clients/${cId}/entities/${eId}/contacts/${ctId}`, {
        method: 'PATCH',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: cId, entityId: eId, contactId: ctId }) },
    );
  }

  function del(cId: string, eId: string, ctId: string, sessionId?: string) {
    return DELETE(
      new NextRequest(`http://localhost/api/clients/${cId}/entities/${eId}/contacts/${ctId}`, {
        method: 'DELETE',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id: cId, entityId: eId, contactId: ctId }) },
    );
  }

  it('updates a contact as a Manager', async () => {
    const response = await patch(
      clientId,
      entityId,
      contactId,
      { designation: 'Accountant' },
      managerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contact.designation).toBe('Accountant');
  });

  it('returns 403 patching as a Preparer', async () => {
    const response = await patch(
      clientId,
      entityId,
      contactId,
      { name: 'Nope' },
      preparerSessionId,
    );
    expect(response.status).toBe(403);
  });

  it('deletes a contact as a Manager', async () => {
    const created = await db.contact.create({
      data: { organisationId, entityId, name: 'Removable Contact' },
    });

    const response = await del(clientId, entityId, created.id, managerSessionId);
    expect(response.status).toBe(200);
  });

  it('returns 403 deleting as a Preparer', async () => {
    const response = await del(clientId, entityId, contactId, preparerSessionId);
    expect(response.status).toBe(403);
  });
});
