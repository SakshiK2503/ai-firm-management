import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { requirePermission } from './enforce';

function requestWithCookie(sessionId?: string) {
  return new NextRequest('http://localhost/api/organisation', {
    headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
  });
}

describe('requirePermission', () => {
  let organisationId: string;
  let allowedSessionId: string;
  let deniedSessionId: string;
  let noRoleSessionId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Enforce Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    await db.permission.upsert({
      where: { key: 'organisation:manage' },
      update: {},
      create: { key: 'organisation:manage', description: 'Manage organisation-wide settings' },
    });

    const allowedRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: allowedRole.id, permissionKey: 'organisation:manage' },
    });
    const deniedRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });

    const passwordHash = await hashPassword('irrelevant');
    const allowedUser = await db.user.create({
      data: {
        organisationId,
        email: `allowed-${crypto.randomUUID()}@example.com`,
        name: 'Allowed User',
        passwordHash,
        roleId: allowedRole.id,
      },
    });
    const deniedUser = await db.user.create({
      data: {
        organisationId,
        email: `denied-${crypto.randomUUID()}@example.com`,
        name: 'Denied User',
        passwordHash,
        roleId: deniedRole.id,
      },
    });
    const noRoleUser = await db.user.create({
      data: {
        organisationId,
        email: `norole-${crypto.randomUUID()}@example.com`,
        name: 'No Role User',
        passwordHash,
      },
    });

    const future = new Date(Date.now() + 60_000);
    allowedSessionId = (
      await db.session.create({
        data: { organisationId, userId: allowedUser.id, expiresAt: future },
      })
    ).id;
    deniedSessionId = (
      await db.session.create({
        data: { organisationId, userId: deniedUser.id, expiresAt: future },
      })
    ).id;
    noRoleSessionId = (
      await db.session.create({
        data: { organisationId, userId: noRoleUser.id, expiresAt: future },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('resolves with the current user when the role has the permission', async () => {
    const result = await requirePermission(
      requestWithCookie(allowedSessionId),
      'organisation:manage',
    );
    expect(result.user.email).toContain('allowed-');
  });

  it('throws a 403 ApiError when the role lacks the permission', async () => {
    await expect(
      requirePermission(requestWithCookie(deniedSessionId), 'organisation:manage'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws a 403 ApiError when the user has no role at all', async () => {
    await expect(
      requirePermission(requestWithCookie(noRoleSessionId), 'organisation:manage'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws a 401 ApiError when there is no session', async () => {
    await expect(
      requirePermission(requestWithCookie(), 'organisation:manage'),
    ).rejects.toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED' });
  });
});
