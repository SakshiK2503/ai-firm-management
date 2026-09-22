import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET } from './route';

describe('/api/tasks/[id]', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let taskId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Task Detail Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['task:view', 'task:viewAll']) {
      await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key },
      });
    }

    const partnerRole = await db.role.create({ data: { organisationId, name: 'Partner' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: partnerRole.id, permissionKey: 'task:view' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'task:viewAll' },
      ],
    });
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });
    await db.rolePermission.create({
      data: { organisationId, roleId: preparerRole.id, permissionKey: 'task:view' },
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

    const client = await db.client.create({ data: { organisationId, name: 'ABC Group' } });
    const entity = await db.clientEntity.create({
      data: { organisationId, clientId: client.id, name: 'ABC Private Limited' },
    });
    const department = await db.department.create({ data: { organisationId, name: 'Taxation' } });
    const service = await db.service.create({
      data: { organisationId, name: 'GST Filing', departmentId: department.id },
    });
    await db.engagement.create({
      data: {
        organisationId,
        clientEntityId: entity.id,
        serviceId: service.id,
        engagementStart: new Date('2026-01-01'),
        billingStructure: 'MONTHLY',
      },
    });

    taskId = (
      await db.task.create({
        data: {
          organisationId,
          taskNumber: `TASK-DETAIL-TEST-${crypto.randomUUID()}`,
          clientId: client.id,
          clientEntityId: entity.id,
          departmentId: department.id,
          serviceId: service.id,
          title: 'File GSTR-1 for August',
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
      new NextRequest(`http://localhost/api/tasks/${id}`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it('fetches a task with its related data as a Partner', async () => {
    const response = await get(taskId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.task.title).toBe('File GSTR-1 for August');
    expect(body.task.client.name).toBe('ABC Group');
    expect(body.task.clientEntity.name).toBe('ABC Private Limited');
    expect(body.task.department.name).toBe('Taxation');
    expect(body.task.service.name).toBe('GST Filing');
  });

  it('returns 404 for a task that does not exist', async () => {
    const response = await get('00000000-0000-0000-0000-000000000000', partnerSessionId);
    expect(response.status).toBe(404);
  });

  it('returns 404 for a Preparer (no assignment mechanism yet)', async () => {
    const response = await get(taskId, preparerSessionId);
    expect(response.status).toBe(404);
  });

  it('returns 401 while logged out', async () => {
    const response = await get(taskId);
    expect(response.status).toBe(401);
  });
});
