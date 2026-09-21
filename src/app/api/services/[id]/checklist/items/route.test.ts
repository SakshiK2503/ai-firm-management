import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { POST } from './route';
import { DELETE } from '../items/[itemId]/route';

describe('/api/services/[id]/checklist/items', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let serviceId: string;
  let serviceWithoutTemplateId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Checklist Items Route Test ${crypto.randomUUID()}` },
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
      data: { organisationId, name: 'Company Formation' },
    });
    serviceId = service.id;
    await db.checklistTemplate.create({
      data: {
        organisationId,
        serviceId,
        name: 'Formation Checklist',
        items: { create: [{ organisationId, label: 'DIN application', position: 0 }] },
      },
    });

    serviceWithoutTemplateId = (
      await db.service.create({ data: { organisationId, name: 'Trademark Filing' } })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function post(id: string, body: unknown, sessionId?: string) {
    return POST(
      new NextRequest(`http://localhost/api/services/${id}/checklist/items`, {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function del(id: string, itemId: string, sessionId?: string) {
    return DELETE(
      new NextRequest(`http://localhost/api/services/${id}/checklist/items/${itemId}`, {
        method: 'DELETE',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id, itemId }) },
    );
  }

  it('adds an item to an existing checklist as a Partner', async () => {
    const response = await post(serviceId, { label: 'PAN application' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.item.label).toBe('PAN application');
    expect(body.item.position).toBe(1);
  });

  it('returns 404 adding an item when the service has no checklist template yet', async () => {
    const response = await post(
      serviceWithoutTemplateId,
      { label: 'Nothing to attach to' },
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });

  it('rejects an empty label', async () => {
    const response = await post(serviceId, { label: '' }, partnerSessionId);
    expect(response.status).toBe(400);
  });

  it('removes an item as a Partner', async () => {
    const created = await post(serviceId, { label: 'Temporary item' }, partnerSessionId);
    const { item } = await created.json();

    const response = await del(serviceId, item.id, partnerSessionId);
    expect(response.status).toBe(200);
  });

  it('returns 404 removing an item that does not belong to this service', async () => {
    const response = await del(
      serviceWithoutTemplateId,
      '00000000-0000-0000-0000-000000000000',
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 adding an item as a Preparer', async () => {
    const response = await post(serviceId, { label: 'Should not be added' }, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 adding an item while logged out', async () => {
    const response = await post(serviceId, { label: 'Should not be added' });
    expect(response.status).toBe(401);
  });
});
