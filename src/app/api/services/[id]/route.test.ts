import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { assertServiceAssignable } from '@/modules/services/service.service';
import { GET, PATCH } from './route';

describe('/api/services/[id]', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let serviceId: string;
  let childServiceId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Service Detail Route Test ${crypto.randomUUID()}` },
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

    const service = await db.service.create({
      data: { organisationId, name: 'Income Tax Return' },
    });
    serviceId = service.id;

    const childService = await db.service.create({
      data: { organisationId, name: 'ITR Review', parentId: serviceId },
    });
    childServiceId = childService.id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(id: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/services/${id}`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function patch(id: string, body: unknown, sessionId?: string) {
    return PATCH(
      new NextRequest(`http://localhost/api/services/${id}`, {
        method: 'PATCH',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('fetches a service as a Partner', async () => {
    const response = await get(serviceId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.service.name).toBe('Income Tax Return');
  });

  it('returns 404 for a service in another organisation', async () => {
    const response = await get('00000000-0000-0000-0000-000000000000', partnerSessionId);
    expect(response.status).toBe(404);
  });

  it('rejects reparenting a service under its own child (would create a cycle)', async () => {
    const response = await patch(serviceId, { parentId: childServiceId }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_PARENT');
  });

  it('rejects a service being its own parent', async () => {
    const response = await patch(serviceId, { parentId: serviceId }, partnerSessionId);
    expect(response.status).toBe(400);
  });

  it('disables a service as a Partner', async () => {
    const response = await patch(serviceId, { isActive: false }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.service.isActive).toBe(false);
  });

  it('a disabled service cannot be newly assigned', async () => {
    await expect(assertServiceAssignable(organisationId, serviceId)).rejects.toMatchObject({
      code: 'SERVICE_DISABLED',
    });
  });

  it('re-enables a service and it becomes assignable again', async () => {
    const response = await patch(serviceId, { isActive: true }, partnerSessionId);
    expect(response.status).toBe(200);
    await expect(assertServiceAssignable(organisationId, serviceId)).resolves.toBeUndefined();
  });

  it('returns 403 updating a service as a Preparer', async () => {
    const response = await patch(serviceId, { name: 'Should Not Update' }, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 updating a service while logged out', async () => {
    const response = await patch(serviceId, { name: 'Should Not Update' });
    expect(response.status).toBe(401);
  });

  it('rejects an empty update body', async () => {
    const response = await patch(serviceId, {}, partnerSessionId);
    expect(response.status).toBe(400);
  });
});
