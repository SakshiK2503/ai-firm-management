import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET } from './route';

function get(cookie?: string) {
  return GET(
    new NextRequest('http://localhost/api/auth/me', {
      headers: cookie ? { cookie } : undefined,
    }),
  );
}

describe('GET /api/auth/me', () => {
  let organisationId: string;
  let userId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Me Route Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    const user = await db.user.create({
      data: {
        organisationId,
        email: `user-${crypto.randomUUID()}@example.com`,
        name: 'Me Route Test User',
        passwordHash: await hashPassword('irrelevant'),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('returns 401 when there is no session cookie', async () => {
    const response = await get();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns the current user for a valid session cookie', async () => {
    const session = await db.session.create({
      data: { userId, organisationId, expiresAt: new Date(Date.now() + 60_000) },
    });

    const response = await get(`${SESSION_COOKIE_NAME}=${session.id}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id).toBe(userId);
  });

  it('slides the session expiry forward on a successful check', async () => {
    const session = await db.session.create({
      data: { userId, organisationId, expiresAt: new Date(Date.now() + 60_000) },
    });

    const response = await get(`${SESSION_COOKIE_NAME}=${session.id}`);
    expect(response.status).toBe(200);

    const refreshed = await db.session.findUniqueOrThrow({ where: { id: session.id } });
    expect(refreshed.expiresAt.getTime()).toBeGreaterThan(session.expiresAt.getTime());

    const setCookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(setCookie?.value).toBe(session.id);
  });

  it('returns 401 for an expired session', async () => {
    const session = await db.session.create({
      data: { userId, organisationId, expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await get(`${SESSION_COOKIE_NAME}=${session.id}`);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});
