import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';
import { DELETE } from './[availabilityId]/route';

describe('/api/employees/[id]/availability', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let employeeId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Employee Availability Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['availability:view', 'availability:manage']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: partnerRole.id, permissionKey: 'availability:view' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'availability:manage' },
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
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(id: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/employees/${id}/availability`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function post(id: string, body: unknown, sessionId?: string) {
    return POST(
      new NextRequest(`http://localhost/api/employees/${id}/availability`, {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function del(id: string, availabilityId: string, sessionId?: string) {
    return DELETE(
      new NextRequest(`http://localhost/api/employees/${id}/availability/${availabilityId}`, {
        method: 'DELETE',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id, availabilityId }) },
    );
  }

  it('returns an empty list for an employee with no availability recorded', async () => {
    const response = await get(employeeId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.availability).toEqual([]);
  });

  it('creates a leave record as a Partner', async () => {
    const response = await post(
      employeeId,
      { type: 'LEAVE', startDate: '2026-10-01', endDate: '2026-10-05', reason: 'Diwali' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.availability.type).toBe('LEAVE');
  });

  it('rejects an end date before the start date with a validation error', async () => {
    const response = await post(
      employeeId,
      { type: 'SICK', startDate: '2026-11-10', endDate: '2026-11-05' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_DATE_RANGE');
  });

  it('returns 403 creating an availability record as a Preparer', async () => {
    const response = await post(
      employeeId,
      { type: 'LEAVE', startDate: '2027-01-01', endDate: '2027-01-02' },
      preparerSessionId,
    );
    expect(response.status).toBe(403);
  });

  it('deletes an availability record as a Partner', async () => {
    const created = await post(
      employeeId,
      { type: 'UNAVAILABLE', startDate: '2027-03-01', endDate: '2027-03-02' },
      partnerSessionId,
    );
    const createdBody = await created.json();

    const response = await del(employeeId, createdBody.availability.id, partnerSessionId);
    expect(response.status).toBe(200);
  });

  it('returns 401 without a session', async () => {
    const response = await get(employeeId);
    expect(response.status).toBe(401);
  });
});
