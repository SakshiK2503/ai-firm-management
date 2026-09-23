import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET, POST } from './route';

describe('/api/tasks', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let preparerUserId: string;
  let clientId: string;
  let entityId: string;
  let otherClientEntityId: string;
  let serviceId: string;
  let disabledServiceId: string;
  let unengagedServiceId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Tasks Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['task:view', 'task:viewAll', 'task:create']) {
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
        { organisationId, roleId: partnerRole.id, permissionKey: 'task:create' },
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
    preparerUserId = preparerUser.id;
    preparerSessionId = (
      await db.session.create({
        data: { organisationId, userId: preparerUser.id, expiresAt: future },
      })
    ).id;

    const department = await db.department.create({ data: { organisationId, name: 'Taxation' } });

    const client = await db.client.create({ data: { organisationId, name: 'ABC Group' } });
    clientId = client.id;
    entityId = (
      await db.clientEntity.create({
        data: { organisationId, clientId, name: 'ABC Private Limited' },
      })
    ).id;

    const otherClient = await db.client.create({ data: { organisationId, name: 'XYZ Group' } });
    otherClientEntityId = (
      await db.clientEntity.create({
        data: { organisationId, clientId: otherClient.id, name: 'XYZ LLP' },
      })
    ).id;

    serviceId = (
      await db.service.create({
        data: { organisationId, name: 'GST Filing', departmentId: department.id },
      })
    ).id;
    await db.engagement.create({
      data: {
        organisationId,
        clientEntityId: entityId,
        serviceId,
        engagementStart: new Date('2026-01-01'),
        billingStructure: 'MONTHLY',
      },
    });

    disabledServiceId = (
      await db.service.create({
        data: { organisationId, name: 'Discontinued Service', isActive: false },
      })
    ).id;
    await db.engagement.create({
      data: {
        organisationId,
        clientEntityId: entityId,
        serviceId: disabledServiceId,
        engagementStart: new Date('2026-01-01'),
        billingStructure: 'MONTHLY',
      },
    });

    unengagedServiceId = (
      await db.service.create({ data: { organisationId, name: 'Statutory Audit' } })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(sessionId?: string, query = '') {
    return GET(
      new NextRequest(`http://localhost/api/tasks${query}`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
    );
  }

  function post(body: unknown, sessionId?: string) {
    return POST(
      new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify(body),
      }),
    );
  }

  it('creates a task with client/entity/service validation as a Partner', async () => {
    const response = await post(
      { clientId, clientEntityId: entityId, serviceId, title: 'File GSTR-1 for August' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.task.title).toBe('File GSTR-1 for August');
    expect(body.task.client.name).toBe('ABC Group');
    expect(body.task.clientEntity.name).toBe('ABC Private Limited');
    expect(body.task.service.name).toBe('GST Filing');
    expect(body.task.department.name).toBe('Taxation');
    expect(body.task.priority).toBe('NORMAL');
    expect(body.task.source).toBe('MANUAL');
    expect(body.task.status).toBe('NEW');
    expect(body.task.taskNumber).toMatch(/^TASK-\d{4}-\d{2}-\d{6}$/);
  });

  it('generates a second, distinct sequential task number', async () => {
    const first = await post(
      { clientId, clientEntityId: entityId, serviceId, title: 'Task A' },
      partnerSessionId,
    );
    const second = await post(
      { clientId, clientEntityId: entityId, serviceId, title: 'Task B' },
      partnerSessionId,
    );
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(firstBody.task.taskNumber).not.toBe(secondBody.task.taskNumber);
  });

  it('accepts an explicit priority', async () => {
    const response = await post(
      {
        clientId,
        clientEntityId: entityId,
        serviceId,
        title: 'Urgent filing',
        priority: 'CRITICAL',
      },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.task.priority).toBe('CRITICAL');
  });

  it('rejects an entity that belongs to a different client', async () => {
    const response = await post(
      { clientId, clientEntityId: otherClientEntityId, serviceId, title: 'Should fail' },
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });

  it('rejects a service with no engagement on this entity', async () => {
    const response = await post(
      { clientId, clientEntityId: entityId, serviceId: unengagedServiceId, title: 'Should fail' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('NO_ENGAGEMENT');
  });

  it('rejects a service that has since been disabled, even with an active engagement', async () => {
    const response = await post(
      { clientId, clientEntityId: entityId, serviceId: disabledServiceId, title: 'Should fail' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('SERVICE_DISABLED');
  });

  it('rejects an empty title with a validation error', async () => {
    const response = await post(
      { clientId, clientEntityId: entityId, serviceId, title: '' },
      partnerSessionId,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 creating a task as a Preparer', async () => {
    const response = await post(
      { clientId, clientEntityId: entityId, serviceId, title: 'Should fail' },
      preparerSessionId,
    );
    expect(response.status).toBe(403);
  });

  it('returns 401 creating a task while logged out', async () => {
    const response = await post({
      clientId,
      clientEntityId: entityId,
      serviceId,
      title: 'Should fail',
    });
    expect(response.status).toBe(401);
  });

  it('lists tasks as a Partner (task:viewAll)', async () => {
    const response = await get(partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tasks.length).toBeGreaterThan(0);
  });

  it('returns an empty list for a Preparer with nothing assigned to them', async () => {
    const response = await get(preparerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tasks).toEqual([]);
  });

  it('a Preparer sees exactly the tasks assigned to them, not other tasks', async () => {
    const assigned = await db.task.create({
      data: {
        organisationId,
        taskNumber: `TASK-ASSIGNED-TEST-${crypto.randomUUID()}`,
        clientId,
        clientEntityId: entityId,
        serviceId,
        title: 'Assigned to preparer',
        assignedToId: preparerUserId,
      },
    });

    const response = await get(preparerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].id).toBe(assigned.id);
  });

  it('returns 401 listing tasks while logged out', async () => {
    const response = await get();
    expect(response.status).toBe(401);
  });

  it('filters tasks by status', async () => {
    const created = await post(
      { clientId, clientEntityId: entityId, serviceId, title: 'To be reviewed' },
      partnerSessionId,
    );
    const { task } = await created.json();
    await db.task.update({ where: { id: task.id }, data: { status: 'IN_PROGRESS' } });

    const response = await get(partnerSessionId, '?status=IN_PROGRESS');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tasks.length).toBeGreaterThan(0);
    expect(body.tasks.every((t: { status: string }) => t.status === 'IN_PROGRESS')).toBe(true);
  });

  it('filters tasks by priority', async () => {
    const response = await get(partnerSessionId, '?priority=CRITICAL');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tasks.length).toBeGreaterThan(0);
    expect(body.tasks.every((t: { priority: string }) => t.priority === 'CRITICAL')).toBe(true);
  });

  it('filters tasks by client', async () => {
    const otherEntity = await db.clientEntity.findUniqueOrThrow({
      where: { id: otherClientEntityId },
    });
    const otherClientTask = await db.task.create({
      data: {
        organisationId,
        taskNumber: `TASK-FILTER-TEST-${crypto.randomUUID()}`,
        clientId: otherEntity.clientId,
        clientEntityId: otherClientEntityId,
        serviceId,
        title: 'Other client task',
      },
    });

    const response = await get(partnerSessionId, `?clientId=${clientId}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tasks.every((t: { client: { id: string } }) => t.client.id === clientId)).toBe(
      true,
    );
    expect(body.tasks.some((t: { id: string }) => t.id === otherClientTask.id)).toBe(false);
  });

  it('rejects an invalid status filter value', async () => {
    const response = await get(partnerSessionId, '?status=NOT_A_REAL_STATUS');
    expect(response.status).toBe(400);
  });

  it('filters tasks by assignedToId', async () => {
    const assigned = await db.task.create({
      data: {
        organisationId,
        taskNumber: `TASK-ASSIGNEE-FILTER-TEST-${crypto.randomUUID()}`,
        clientId,
        clientEntityId: entityId,
        serviceId,
        title: 'Filter by assignee',
        assignedToId: preparerUserId,
      },
    });

    const response = await get(partnerSessionId, `?assignedToId=${preparerUserId}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(
      body.tasks.every(
        (t: { assignedTo: { id: string } | null }) => t.assignedTo?.id === preparerUserId,
      ),
    ).toBe(true);
    expect(body.tasks.some((t: { id: string }) => t.id === assigned.id)).toBe(true);
  });
});
