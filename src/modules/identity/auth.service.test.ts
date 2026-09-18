import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { login } from './auth.service';

describe('login', () => {
  let organisationId: string;
  const password = 'correct-password';
  const email = `user-${crypto.randomUUID()}@example.com`;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Auth Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    await db.user.create({
      data: {
        organisationId,
        email,
        name: 'Active User',
        passwordHash: await hashPassword(password),
      },
    });

    await db.user.create({
      data: {
        organisationId,
        email: `inactive-${crypto.randomUUID()}@example.com`,
        name: 'Inactive User',
        passwordHash: await hashPassword(password),
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('logs in with a valid email and password, and creates a session', async () => {
    const result = await login(email, password);

    expect(result.user.email).toBe(email);
    expect(result.session.userId).toBe(result.user.id);
    expect(result.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password without revealing which part was wrong', async () => {
    await expect(login(email, 'wrong-password')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects a non-existent email with the same error as a wrong password', async () => {
    await expect(login('nobody@example.com', password)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects login for an inactive user', async () => {
    const inactiveEmail = (
      await db.user.findFirstOrThrow({ where: { organisationId, isActive: false } })
    ).email;

    await expect(login(inactiveEmail, password)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });
});
