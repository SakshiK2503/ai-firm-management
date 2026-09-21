import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/services/[id]/checklist', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let serviceId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Checklist Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['service:view', 'service:manage']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: partnerRole.id, permissionKey: 'service:view' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'service:manage' },
      ],
    });
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: preparerRole.id, permissionKey: 'service:view' },
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

    serviceId = (await db.service.create({ data: { organisationId, name: 'Statutory Audit' } })).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(id: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/services/${id}/checklist`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function post(id: string, body: unknown, sessionId?: string) {
    return POST(
      new NextRequest(`http://localhost/api/services/${id}/checklist`, {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('has no checklist template for a fresh service (empty state)', async () => {
    const response = await get(serviceId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checklist).toBeNull();
  });

  it('attaches a checklist template to a service as a Partner', async () => {
    const response = await post(
      serviceId,
      {
        name: 'Standard Audit Checklist',
        items: ['Engagement letter', 'Trial balance', 'Bank confirmations'],
      },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.checklist.name).toBe('Standard Audit Checklist');
    expect(body.checklist.items).toHaveLength(3);
    expect(body.checklist.items[0].label).toBe('Engagement letter');
    expect(body.checklist.items[0].position).toBe(0);
  });

  it('rejects a checklist with no items', async () => {
    const other = await db.service.create({
      data: { organisationId, name: 'Internal Audit' },
    });
    const response = await post(other.id, { name: 'Empty', items: [] }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a second checklist template for the same service with 409', async () => {
    const response = await post(serviceId, { name: 'Duplicate', items: ['One'] }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('returns 403 attaching a checklist as a Preparer', async () => {
    const other = await db.service.create({
      data: { organisationId, name: 'Tax Advisory' },
    });
    const response = await post(other.id, { name: 'X', items: ['A'] }, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 attaching a checklist while logged out', async () => {
    const response = await post(serviceId, { name: 'X', items: ['A'] });
    expect(response.status).toBe(401);
  });
});
