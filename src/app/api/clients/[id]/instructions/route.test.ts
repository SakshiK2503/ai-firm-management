import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { PATCH } from './route';

describe('/api/clients/[id]/instructions', () => {
  let organisationId: string;
  let managerSessionId: string;
  let preparerSessionId: string;
  let clientId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Client Instructions Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['client:view', 'client:editContact']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

    // Manager gets editContact (unlike editStructural) - instructions are lightweight,
    // day-to-day content, not gated the same way as name/isActive.
    const managerRole = await db.role.create({ data: { organisationId, name: 'Manager' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: managerRole.id, permissionKey: 'client:view' },
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
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function patch(id: string, body: unknown, sessionId?: string) {
    return PATCH(
      new NextRequest(`http://localhost/api/clients/${id}/instructions`, {
        method: 'PATCH',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('updates instructions as a Manager', async () => {
    const response = await patch(
      clientId,
      { instructions: 'Always send invoices in USD.' },
      managerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.client.instructions).toBe('Always send invoices in USD.');
  });

  it('clears instructions with null', async () => {
    const response = await patch(clientId, { instructions: null }, managerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.client.instructions).toBeNull();
  });

  it('returns 403 as a Preparer', async () => {
    const response = await patch(clientId, { instructions: 'Nope' }, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 without a session', async () => {
    const response = await patch(clientId, { instructions: 'Nope' });
    expect(response.status).toBe(401);
  });
});
