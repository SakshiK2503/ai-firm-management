import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, PATCH, POST } from './route';

describe('/api/services/[id]/recurring-config', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let recurringServiceId: string;
  let nonRecurringServiceId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Recurring Config Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['service:view', 'service:manage']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: partnerRole.id, permissionKey: 'service:view' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'service:manage' },
      ],
    });
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: preparerRole.id, permissionKey: 'service:view' },
    });

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

    recurringServiceId = (
      await db.service.create({ data: { organisationId, name: 'GST Filing', isRecurring: true } })
    ).id;
    nonRecurringServiceId = (
      await db.service.create({ data: { organisationId, name: 'One-off Advisory' } })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(id: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/services/${id}/recurring-config`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function post(id: string, body: unknown, sessionId?: string) {
    return POST(
      new NextRequest(`http://localhost/api/services/${id}/recurring-config`, {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function patch(id: string, body: unknown, sessionId?: string) {
    return PATCH(
      new NextRequest(`http://localhost/api/services/${id}/recurring-config`, {
        method: 'PATCH',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('has no recurrence calendar for a fresh recurring service (empty state)', async () => {
    const response = await get(recurringServiceId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.config).toBeNull();
  });

  it('rejects configuring a calendar on a non-recurring service', async () => {
    const response = await post(
      nonRecurringServiceId,
      { frequency: 'MONTHLY', dayOfMonth: 20 },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('SERVICE_NOT_RECURRING');
  });

  it('creates a monthly recurrence calendar and generates a test next occurrence', async () => {
    const response = await post(
      recurringServiceId,
      { frequency: 'MONTHLY', dayOfMonth: 20 },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.config.frequency).toBe('MONTHLY');
    expect(body.config.dayOfMonth).toBe(20);
  });

  it('rejects an annual recurrence with no month of year', async () => {
    const response = await post(
      nonRecurringServiceId,
      { frequency: 'ANNUALLY', dayOfMonth: 15 },
      partnerSessionId,
    );
    expect(response.status).toBe(400);
  });

  it('rejects a day of month above 28', async () => {
    const other = await db.service.create({
      data: { organisationId, name: 'TDS Filing', isRecurring: true },
    });
    const response = await post(
      other.id,
      { frequency: 'MONTHLY', dayOfMonth: 30 },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a second recurrence calendar for the same service with 409', async () => {
    const response = await post(
      recurringServiceId,
      { frequency: 'ANNUALLY', dayOfMonth: 10, monthOfYear: 10 },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('retrieves the calendar with a computed next occurrence', async () => {
    const response = await get(recurringServiceId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.config.frequency).toBe('MONTHLY');
    expect(body.config.nextOccurrence).toBeDefined();
    expect(new Date(body.config.nextOccurrence).getDate()).toBe(20);
  });

  it('updates the recurrence calendar to quarterly', async () => {
    const response = await patch(
      recurringServiceId,
      { frequency: 'QUARTERLY', dayOfMonth: 10 },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.config.frequency).toBe('QUARTERLY');
    expect(body.config.dayOfMonth).toBe(10);
  });

  it('returns 404 updating a calendar that does not exist yet', async () => {
    const other = await db.service.create({
      data: { organisationId, name: 'MCA Filing', isRecurring: true },
    });
    const response = await patch(
      other.id,
      { frequency: 'MONTHLY', dayOfMonth: 5 },
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 creating a calendar as a Preparer', async () => {
    const other = await db.service.create({
      data: { organisationId, name: 'Payroll', isRecurring: true },
    });
    const response = await post(
      other.id,
      { frequency: 'MONTHLY', dayOfMonth: 1 },
      preparerSessionId,
    );
    expect(response.status).toBe(403);
  });

  it('returns 401 creating a calendar while logged out', async () => {
    const response = await post(recurringServiceId, { frequency: 'MONTHLY', dayOfMonth: 1 });
    expect(response.status).toBe(401);
  });
});
