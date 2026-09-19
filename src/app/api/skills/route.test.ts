import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/skills', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let managerSessionId: string;
  let preparerSessionId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Skills Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['skill:view', 'skill:manage']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: partnerRole.id, permissionKey: 'skill:view' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'skill:manage' },
      ],
    });
    const managerRole = await db.role.create({ data: { organisationId, name: 'Manager' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: managerRole.id, permissionKey: 'skill:view' },
    });
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });

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
      new NextRequest('http://localhost/api/skills', {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
    );
  }

  it('creates a skill as a Partner', async () => {
    const response = await post({ name: 'GST Filing' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.skill.name).toBe('GST Filing');
  });

  it('rejects an empty name with a validation error', async () => {
    const response = await post({ name: '' }, partnerSessionId);
    expect(response.status).toBe(400);
  });

  it('returns 403 creating a skill as a Manager (view-only)', async () => {
    const response = await post({ name: 'Should Not Exist' }, managerSessionId);
    expect(response.status).toBe(403);
  });

  it('lists skills as a Manager (view permission)', async () => {
    const response = await get('http://localhost/api/skills', managerSessionId);
    expect(response.status).toBe(200);
  });

  it('returns 403 listing skills as a Preparer', async () => {
    const response = await get('http://localhost/api/skills', preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 without a session', async () => {
    const response = await get('http://localhost/api/skills');
    expect(response.status).toBe(401);
  });
});
