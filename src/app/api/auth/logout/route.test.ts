import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { POST } from './route';

function post(cookie?: string) {
  return POST(
    new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: cookie ? { cookie } : undefined,
    }),
  );
}

describe('POST /api/auth/logout', () => {
  let organisationId: string;
  let userId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Logout Route Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    const user = await db.user.create({
      data: {
        organisationId,
        email: `user-${crypto.randomUUID()}@example.com`,
        name: 'Logout Route Test User',
        passwordHash: await hashPassword('irrelevant'),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('deletes the session and clears the cookie', async () => {
    const session = await db.session.create({
      data: { userId, organisationId, expiresAt: new Date(Date.now() + 60_000) },
    });

    const response = await post(`${SESSION_COOKIE_NAME}=${session.id}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);

    const found = await db.session.findUnique({ where: { id: session.id } });
    expect(found).toBeNull();

    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.value).toBe('');
  });

  it('succeeds even when there is no session cookie', async () => {
    const response = await post();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
