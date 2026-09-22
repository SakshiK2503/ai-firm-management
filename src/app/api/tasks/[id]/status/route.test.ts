import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { PATCH } from './route';

describe('/api/tasks/[id]/status', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let clientId: string;
  let entityId: string;
  let serviceId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Task Status Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['task:view', 'task:updateStatus', 'task:review', 'task:cancel']) {
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
        { organisationId, roleId: partnerRole.id, permissionKey: 'task:updateStatus' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'task:review' },
        { organisationId, roleId: partnerRole.id, permissionKey: 'task:cancel' },
      ],
    });
    // Preparer only gets task:updateStatus, matching the real seed data - can move a task
    // through its own work, but cannot review or cancel.
    const preparerRole = await db.role.create({ data: { organisationId, name: 'Preparer' } });
    await db.rolePermission.createMany({
      data: [
        { organisationId, roleId: preparerRole.id, permissionKey: 'task:view' },
        { organisationId, roleId: preparerRole.id, permissionKey: 'task:updateStatus' },
      ],
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
    clientId = client.id;
    const entity = await db.clientEntity.create({
      data: { organisationId, clientId, name: 'ABC Private Limited' },
    });
    entityId = entity.id;
    const service = await db.service.create({ data: { organisationId, name: 'GST Filing' } });
    serviceId = service.id;
    await db.engagement.create({
      data: {
        organisationId,
        clientEntityId: entityId,
        serviceId,
        engagementStart: new Date('2026-01-01'),
        billingStructure: 'MONTHLY',
      },
    });
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  async function createTask(title: string) {
    return db.task.create({
      data: {
        organisationId,
        taskNumber: `TASK-STATUS-TEST-${crypto.randomUUID()}`,
        clientId,
        clientEntityId: entityId,
        serviceId,
        title,
      },
    });
  }

  function patch(taskId: string, status: string, sessionId?: string) {
    return PATCH(
      new NextRequest(`http://localhost/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify({ status }),
      }),
      { params: Promise.resolve({ id: taskId }) },
    );
  }

  it('walks a task through the entire happy-path workflow as a Partner', async () => {
    const task = await createTask('Full workflow walk');

    const sequence = [
      'AWAITING_ALLOCATION',
      'ASSIGNED',
      'IN_PROGRESS',
      'SUBMITTED_FOR_REVIEW',
      'REVIEW_IN_PROGRESS',
      'APPROVED',
      'CLIENT_DELIVERY',
      'COMPLETED',
      'ARCHIVED',
    ];

    for (const status of sequence) {
      const response = await patch(task.id, status, partnerSessionId);
      const body = await response.json();
      expect(response.status, `transitioning to ${status}`).toBe(200);
      expect(body.task.status).toBe(status);
    }

    const history = await db.taskStatusHistory.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(history).toHaveLength(sequence.length);
    expect(history.every((h) => h.succeeded)).toBe(true);
  });

  it('walks the awaiting-client-info side branch back into progress', async () => {
    const task = await createTask('Side branch');
    await patch(task.id, 'AWAITING_ALLOCATION', partnerSessionId);
    await patch(task.id, 'ASSIGNED', partnerSessionId);
    await patch(task.id, 'IN_PROGRESS', partnerSessionId);

    const toWaiting = await patch(task.id, 'AWAITING_CLIENT_INFO', partnerSessionId);
    expect((await toWaiting.json()).task.status).toBe('AWAITING_CLIENT_INFO');

    const backToProgress = await patch(task.id, 'IN_PROGRESS', partnerSessionId);
    expect((await backToProgress.json()).task.status).toBe('IN_PROGRESS');
  });

  it('walks the correction-required rework loop', async () => {
    const task = await createTask('Rework loop');
    await patch(task.id, 'AWAITING_ALLOCATION', partnerSessionId);
    await patch(task.id, 'ASSIGNED', partnerSessionId);
    await patch(task.id, 'IN_PROGRESS', partnerSessionId);
    await patch(task.id, 'SUBMITTED_FOR_REVIEW', partnerSessionId);
    await patch(task.id, 'REVIEW_IN_PROGRESS', partnerSessionId);

    const corrected = await patch(task.id, 'CORRECTION_REQUIRED', partnerSessionId);
    expect((await corrected.json()).task.status).toBe('CORRECTION_REQUIRED');

    const backToProgress = await patch(task.id, 'IN_PROGRESS', partnerSessionId);
    expect((await backToProgress.json()).task.status).toBe('IN_PROGRESS');
  });

  it('rejects an invalid transition and logs it as a failed attempt', async () => {
    const task = await createTask('Invalid jump');

    const response = await patch(task.id, 'COMPLETED', partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_TRANSITION');

    const history = await db.taskStatusHistory.findFirst({ where: { taskId: task.id } });
    expect(history?.succeeded).toBe(false);
    expect(history?.fromStatus).toBe('NEW');
    expect(history?.toStatus).toBe('COMPLETED');
    expect(history?.reason).toContain('NEW');
  });

  it('a task can be cancelled from a non-terminal status', async () => {
    const task = await createTask('To be cancelled');
    await patch(task.id, 'AWAITING_ALLOCATION', partnerSessionId);

    const response = await patch(task.id, 'CANCELLED', partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.task.status).toBe('CANCELLED');
  });

  it('rejects moving a cancelled task anywhere else', async () => {
    const task = await createTask('Already cancelled');
    await patch(task.id, 'CANCELLED', partnerSessionId);

    const response = await patch(task.id, 'AWAITING_ALLOCATION', partnerSessionId);
    expect(response.status).toBe(400);
  });

  it('a Preparer can move a task forward with task:updateStatus', async () => {
    const task = await createTask('Preparer progresses');
    const response = await patch(task.id, 'AWAITING_ALLOCATION', preparerSessionId);
    expect(response.status).toBe(200);
  });

  it('returns 403 when a Preparer attempts a review decision', async () => {
    const task = await createTask('Preparer cannot review');
    await patch(task.id, 'AWAITING_ALLOCATION', partnerSessionId);
    await patch(task.id, 'ASSIGNED', partnerSessionId);
    await patch(task.id, 'IN_PROGRESS', partnerSessionId);
    await patch(task.id, 'SUBMITTED_FOR_REVIEW', partnerSessionId);

    const response = await patch(task.id, 'REVIEW_IN_PROGRESS', preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 403 when a Preparer attempts to cancel', async () => {
    const task = await createTask('Preparer cannot cancel');
    const response = await patch(task.id, 'CANCELLED', preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('rejects an unrecognised status value with a validation error', async () => {
    const task = await createTask('Bad status value');
    const response = await patch(task.id, 'NOT_A_REAL_STATUS', partnerSessionId);
    expect(response.status).toBe(400);
  });

  it('returns 404 for a task that does not exist', async () => {
    const response = await patch(
      '00000000-0000-0000-0000-000000000000',
      'AWAITING_ALLOCATION',
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });

  it('returns 401 while logged out', async () => {
    const task = await createTask('Logged out');
    const response = await patch(task.id, 'AWAITING_ALLOCATION');
    expect(response.status).toBe(401);
  });
});
