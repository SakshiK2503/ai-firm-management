import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';
import { DELETE } from './[skillId]/route';

describe('/api/employees/[id]/skills', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let employeeId: string;
  let skillId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Employee Skills Route Test ${crypto.randomUUID()}` },
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

    employeeId = (
      await db.user.create({
        data: {
          organisationId,
          email: `subject-${crypto.randomUUID()}@example.com`,
          name: 'Subject Employee',
          passwordHash,
        },
      })
    ).id;
    skillId = (await db.skill.create({ data: { organisationId, name: 'Auditing' } })).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(id: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/employees/${id}/skills`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function post(id: string, body: unknown, sessionId?: string) {
    return POST(
      new NextRequest(`http://localhost/api/employees/${id}/skills`, {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function del(id: string, skill: string, sessionId?: string) {
    return DELETE(
      new NextRequest(`http://localhost/api/employees/${id}/skills/${skill}`, {
        method: 'DELETE',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id, skillId: skill }) },
    );
  }

  it('returns an empty list for an employee with no skills assigned', async () => {
    const response = await get(employeeId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.skills).toEqual([]);
  });

  it('assigns a skill as a Partner', async () => {
    const response = await post(employeeId, { skillId, level: 'ADVANCED' }, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.employeeSkill.level).toBe('ADVANCED');
    expect(body.employeeSkill.skill.id).toBe(skillId);
  });

  it('rejects an invalid level with a validation error', async () => {
    const response = await post(employeeId, { skillId, level: 'NOT_A_LEVEL' }, partnerSessionId);
    expect(response.status).toBe(400);
  });

  it('returns 403 assigning a skill as a Preparer', async () => {
    const response = await post(employeeId, { skillId, level: 'BEGINNER' }, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('removes an assigned skill as a Partner', async () => {
    const response = await del(employeeId, skillId, partnerSessionId);
    expect(response.status).toBe(200);

    const listResponse = await get(employeeId, partnerSessionId);
    const body = await listResponse.json();
    expect(body.skills).toEqual([]);
  });
});
