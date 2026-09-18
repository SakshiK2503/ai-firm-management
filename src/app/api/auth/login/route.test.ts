import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { POST } from './route';

function post(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/auth/login', () => {
  let organisationId: string;
  const email = `user-${crypto.randomUUID()}@example.com`;
  const password = 'correct-password';

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Login Route Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    await db.user.create({
      data: {
        organisationId,
        email,
        name: 'Route Test User',
        passwordHash: await hashPassword(password),
      },
    });
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('logs in with valid credentials and sets a session cookie', async () => {
    const response = await post({ email, password });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.email).toBe(email);
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBeTruthy();
  });

  it('rejects an invalid password with a predictable error', async () => {
    const response = await post({ email, password: 'wrong-password' });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an empty payload with a VALIDATION_ERROR', async () => {
    const response = await post({});
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed JSON', async () => {
    const response = await post('{not json');
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });
});
