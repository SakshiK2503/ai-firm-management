import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/clients/[id]/entities/[entityId]/engagements', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let managerSessionId: string;
  let clientId: string;
  let entityId: string;
  let otherClientEntityId: string;
  let serviceId: string;
  let disabledServiceId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Engagements Route Test ${crypto.randomUUID()}` },
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

    const client = await db.client.create({ data: { organisationId, name: 'ABC Group' } });
    clientId = client.id;
    entityId = (
      await db.clientEntity.create({
        data: { organisationId, clientId, name: 'ABC Private Limited' },
      })
    ).id;

    const otherClient = await db.client.create({ data: { organisationId, name: 'XYZ Group' } });
    otherClientEntityId = (
      await db.clientEntity.create({
        data: { organisationId, clientId: otherClient.id, name: 'XYZ LLP' },
      })
    ).id;

    serviceId = (await db.service.create({ data: { organisationId, name: 'GST Filing' } })).id;
    disabledServiceId = (
      await db.service.create({
        data: { organisationId, name: 'Discontinued Service', isActive: false },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(clientIdParam: string, entityIdParam: string, sessionId?: string) {
    return GET(
      new NextRequest(
        `http://localhost/api/clients/${clientIdParam}/entities/${entityIdParam}/engagements`,
        { headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined },
      ),
      { params: Promise.resolve({ id: clientIdParam, entityId: entityIdParam }) },
    );
  }

  function post(clientIdParam: string, entityIdParam: string, body: unknown, sessionId?: string) {
    return POST(
      new NextRequest(
        `http://localhost/api/clients/${clientIdParam}/entities/${entityIdParam}/engagements`,
        {
          method: 'POST',
          headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
          body: JSON.stringify(body),
        },
      ),
      { params: Promise.resolve({ id: clientIdParam, entityId: entityIdParam }) },
    );
  }

  it('has no engagements for a fresh entity (empty state)', async () => {
    const response = await get(clientId, entityId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.engagements).toEqual([]);
  });

  it('links a service to an entity as a Partner', async () => {
    const response = await post(
      clientId,
      entityId,
      { serviceId, engagementStart: '2026-04-01', billingStructure: 'MONTHLY' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.engagement.service.name).toBe('GST Filing');
    expect(body.engagement.billingStructure).toBe('MONTHLY');
    expect(body.engagement.isActive).toBe(true);
  });

  it('rejects engaging a disabled service', async () => {
    const response = await post(
      clientId,
      entityId,
      { serviceId: disabledServiceId, engagementStart: '2026-04-01', billingStructure: 'MONTHLY' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('SERVICE_DISABLED');
  });

  it('rejects a second engagement for the same service on the same entity with 409', async () => {
    const response = await post(
      clientId,
      entityId,
      { serviceId, engagementStart: '2026-05-01', billingStructure: 'ASSIGNMENT' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('rejects a malformed engagementStart with a validation error', async () => {
    const response = await post(
      clientId,
      entityId,
      { serviceId, engagementStart: 'not-a-date', billingStructure: 'MONTHLY' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it("returns 404 when the entity belongs to a different client than the URL's", async () => {
    const response = await get(clientId, otherClientEntityId, partnerSessionId);
    expect(response.status).toBe(404);
  });

  it('returns 403 creating an engagement as a Manager (view-only for this permission)', async () => {
    const response = await post(
      clientId,
      entityId,
      { serviceId, engagementStart: '2026-04-01', billingStructure: 'MONTHLY' },
      managerSessionId,
    );
    expect(response.status).toBe(403);
  });

  it('returns 401 creating an engagement while logged out', async () => {
    const response = await post(clientId, entityId, {
      serviceId,
      engagementStart: '2026-04-01',
      billingStructure: 'MONTHLY',
    });
    expect(response.status).toBe(401);
  });

  it('lists engagements as a Manager (client:view + viewAll is enough to read)', async () => {
    const response = await get(clientId, entityId, managerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.engagements).toHaveLength(1);
  });
});
