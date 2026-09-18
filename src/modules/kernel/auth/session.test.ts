import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { createSession, destroySession, refreshSession } from './session';

describe('session lifecycle', () => {
  let organisationId: string;
  let userId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Session Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    const user = await db.user.create({
      data: {
        organisationId,
        email: `user-${crypto.randomUUID()}@example.com`,
        name: 'Session Test User',
        passwordHash: await hashPassword('irrelevant'),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('creates a session that expires roughly 7 days out', async () => {
    const session = await createSession(userId, organisationId);
    const daysUntilExpiry = (session.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);

    expect(daysUntilExpiry).toBeGreaterThan(6.9);
    expect(daysUntilExpiry).toBeLessThan(7.1);
  });

  it('refreshing a session pushes its expiry further out', async () => {
    const session = await db.session.create({
      data: { userId, organisationId, expiresAt: new Date(Date.now() + 60_000) },
    });

    const refreshed = await refreshSession(session.id);

    expect(refreshed.expiresAt.getTime()).toBeGreaterThan(session.expiresAt.getTime());
  });

  it('destroying a session removes it', async () => {
    const session = await createSession(userId, organisationId);

    await destroySession(session.id);

    const found = await db.session.findUnique({ where: { id: session.id } });
    expect(found).toBeNull();
  });

  it('destroying a session that does not exist does not throw', async () => {
    await expect(destroySession('00000000-0000-0000-0000-000000000000')).resolves.not.toThrow();
  });
});
