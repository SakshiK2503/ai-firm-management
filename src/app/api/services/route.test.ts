import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/services', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let departmentId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Services Route Test ${crypto.randomUUID()}` },
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

    departmentId = (await db.department.create({ data: { organisationId, name: 'Taxation' } })).id;
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
      new NextRequest('http://localhost/api/services', {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
    );
  }

  it('creates a top-level service with required metadata as a Partner', async () => {
    const response = await post(
      {
        name: 'GST Filing',
        departmentId,
        expectedSkillLevel: 'INTERMEDIATE',
        turnaroundDays: 5,
      },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.service.name).toBe('GST Filing');
    expect(body.service.department.name).toBe('Taxation');
    expect(body.service.expectedSkillLevel).toBe('INTERMEDIATE');
    expect(body.service.turnaroundDays).toBe(5);
    expect(body.service.isActive).toBe(true);
  });

  it('rejects an empty name with a validation error', async () => {
    const response = await post({ name: '' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('builds a parent-child hierarchy and returns it as a nested tree', async () => {
    const parentResponse = await post({ name: 'Taxation Services' }, partnerSessionId);
    const parent = (await parentResponse.json()).service;

    const childResponse = await post(
      { name: 'Notice Handling', parentId: parent.id },
      partnerSessionId,
    );
    expect(childResponse.status).toBe(201);

    const listResponse = await get('http://localhost/api/services', partnerSessionId);
    const listBody = await listResponse.json();
    const parentNode = listBody.services.find((s: { id: string }) => s.id === parent.id);

    expect(parentNode).toBeDefined();
    expect(parentNode.children.some((c: { name: string }) => c.name === 'Notice Handling')).toBe(
      true,
    );
  });

  it('rejects a duplicate name under the same parent with 409', async () => {
    await post({ name: 'Audit Services' }, partnerSessionId);
    const response = await post({ name: 'Audit Services' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('rejects an invalid parent id', async () => {
    const response = await post(
      { name: 'Orphan Service', parentId: '00000000-0000-0000-0000-000000000000' },
      partnerSessionId,
    );
    expect(response.status).toBe(400);
  });

  it('returns 403 creating a service as a Preparer', async () => {
    const response = await post({ name: 'Should Not Exist' }, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 creating a service while logged out', async () => {
    const response = await post({ name: 'Should Not Exist' });
    expect(response.status).toBe(401);
  });

  it('lists services as a Partner (empty state when none exist for a fresh filter)', async () => {
    const response = await get(
      'http://localhost/api/services?includeInactive=false',
      partnerSessionId,
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(body.services)).toBe(true);
  });

  it('returns 401 listing services while logged out', async () => {
    const response = await get('http://localhost/api/services', undefined);
    expect(response.status).toBe(401);
  });
});
