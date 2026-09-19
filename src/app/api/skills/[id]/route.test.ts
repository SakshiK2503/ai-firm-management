import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { PATCH } from './route';

describe('/api/skills/[id]', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let skillId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Skill Patch Test ${crypto.randomUUID()}` },
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

    skillId = (await db.skill.create({ data: { organisationId, name: 'Bookkeeping' } })).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function patch(id: string, body: unknown, sessionId?: string) {
    return PATCH(
      new NextRequest(`http://localhost/api/skills/${id}`, {
        method: 'PATCH',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('disables a skill as a Partner', async () => {
    const response = await patch(skillId, { isActive: false }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.skill.isActive).toBe(false);
  });

  it('returns 404 for a skill that does not exist', async () => {
    const response = await patch(
      '00000000-0000-0000-0000-000000000000',
      { isActive: true },
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 patching as a Preparer', async () => {
    const response = await patch(skillId, { isActive: true }, preparerSessionId);
    expect(response.status).toBe(403);
  });
});
