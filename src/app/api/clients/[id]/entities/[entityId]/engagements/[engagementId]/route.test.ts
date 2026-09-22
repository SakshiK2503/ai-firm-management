import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { PATCH } from './route';

describe('/api/clients/[id]/entities/[entityId]/engagements/[engagementId]', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let managerSessionId: string;
  let clientId: string;
  let entityId: string;
  let serviceId: string;
  let engagementId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Engagement Detail Route Test ${crypto.randomUUID()}` },
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

    const client = await db.client.create({ data: { organisationId, name: 'DEF Group' } });
    clientId = client.id;
    entityId = (
      await db.clientEntity.create({ data: { organisationId, clientId, name: 'DEF Pvt Ltd' } })
    ).id;
    serviceId = (await db.service.create({ data: { organisationId, name: 'Statutory Audit' } })).id;

    engagementId = (
      await db.engagement.create({
        data: {
          organisationId,
          clientEntityId: entityId,
          serviceId,
          engagementStart: new Date('2026-01-01'),
          billingStructure: 'ASSIGNMENT',
        },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function patch(
    clientIdParam: string,
    entityIdParam: string,
    engagementIdParam: string,
    body: unknown,
    sessionId?: string,
  ) {
    return PATCH(
      new NextRequest(
        `http://localhost/api/clients/${clientIdParam}/entities/${entityIdParam}/engagements/${engagementIdParam}`,
        {
          method: 'PATCH',
          headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
          body: JSON.stringify(body),
        },
      ),
      {
        params: Promise.resolve({
          id: clientIdParam,
          entityId: entityIdParam,
          engagementId: engagementIdParam,
        }),
      },
    );
  }

  it('changes the billing structure as a Partner', async () => {
    const response = await patch(
      clientId,
      entityId,
      engagementId,
      { billingStructure: 'MONTHLY' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.engagement.billingStructure).toBe('MONTHLY');
  });

  it('terminates an engagement as a Partner', async () => {
    const response = await patch(
      clientId,
      entityId,
      engagementId,
      { isActive: false },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.engagement.isActive).toBe(false);
  });

  it('reactivates a terminated engagement', async () => {
    const response = await patch(
      clientId,
      entityId,
      engagementId,
      { isActive: true },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.engagement.isActive).toBe(true);
  });

  it('rejects reactivating an engagement whose service has since been disabled', async () => {
    await patch(clientId, entityId, engagementId, { isActive: false }, partnerSessionId);
    await db.service.update({ where: { id: serviceId }, data: { isActive: false } });

    const response = await patch(
      clientId,
      entityId,
      engagementId,
      { isActive: true },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('SERVICE_DISABLED');

    await db.service.update({ where: { id: serviceId }, data: { isActive: true } });
  });

  it('returns 404 for an engagement id that does not exist', async () => {
    const response = await patch(
      clientId,
      entityId,
      '00000000-0000-0000-0000-000000000000',
      { isActive: false },
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 updating an engagement as a Manager', async () => {
    const response = await patch(
      clientId,
      entityId,
      engagementId,
      { billingStructure: 'ASSIGNMENT' },
      managerSessionId,
    );
    expect(response.status).toBe(403);
  });

  it('returns 401 updating an engagement while logged out', async () => {
    const response = await patch(clientId, entityId, engagementId, {
      billingStructure: 'ASSIGNMENT',
    });
    expect(response.status).toBe(401);
  });

  it('rejects an empty update body', async () => {
    const response = await patch(clientId, entityId, engagementId, {}, partnerSessionId);
    expect(response.status).toBe(400);
  });
});
