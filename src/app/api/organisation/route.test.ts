import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET } from './route';

function get(sessionId?: string) {
  return GET(
    new NextRequest('http://localhost/api/organisation', {
      headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
    }),
  );
}

describe('GET /api/organisation', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Org Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    await db.permission.upsert({
      where: { key: 'organisation:manage' },
      update: {},
      create: { key: 'organisation:manage', description: 'Manage organisation-wide settings' },
    });

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: partnerRole.id, permissionKey: 'organisation:manage' },
    });
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });

    const passwordHash = await hashPassword('irrelevant');
    const partnerUser = await db.user.create({
      data: {
        organisationId,
        email: `partner-${crypto.randomUUID()}@example.com`,
        name: 'Partner User',
        passwordHash,
        roleId: partnerRole.id,
      },
    });
    const preparerUser = await db.user.create({
      data: {
        organisationId,
        email: `preparer-${crypto.randomUUID()}@example.com`,
        name: 'Preparer User',
        passwordHash,
        roleId: preparerRole.id,
      },
    });

    const future = new Date(Date.now() + 60_000);
    partnerSessionId = (
      await db.session.create({
        data: { organisationId, userId: partnerUser.id, expiresAt: future },
      })
    ).id;
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

  it('returns 200 with the organisation for a user whose role has organisation:manage', async () => {
    const response = await get(partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.organisation.id).toBe(organisationId);
  });

  it('returns 403 for a user whose role lacks organisation:manage', async () => {
    const response = await get(preparerSessionId);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 for a logged-out request', async () => {
    const response = await get();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});
