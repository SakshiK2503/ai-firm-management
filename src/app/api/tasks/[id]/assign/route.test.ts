import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { POST } from './route';

describe('/api/tasks/[id]/assign', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let taxDepartmentId: string;
  let auditDepartmentId: string;
  let eligibleEmployeeId: string;
  let wrongDepartmentEmployeeId: string;
  let inactiveEmployeeId: string;
  let clientId: string;
  let entityId: string;
  let serviceId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Task Assign Route Test ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    for (const key of ['task:view', 'task:reassign']) {
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
        { organisationId, roleId: partnerRole.id, permissionKey: 'task:reassign' },
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

    taxDepartmentId = (await db.department.create({ data: { organisationId, name: 'Taxation' } }))
      .id;
    auditDepartmentId = (await db.department.create({ data: { organisationId, name: 'Audit' } }))
      .id;

    eligibleEmployeeId = (
      await db.user.create({
        data: {
          organisationId,
          email: `eligible-${crypto.randomUUID()}@example.com`,
          name: 'Eligible Employee',
          passwordHash,
          departmentId: taxDepartmentId,
        },
      })
    ).id;
    wrongDepartmentEmployeeId = (
      await db.user.create({
        data: {
          organisationId,
          email: `wrong-dept-${crypto.randomUUID()}@example.com`,
          name: 'Wrong Department Employee',
          passwordHash,
          departmentId: auditDepartmentId,
        },
      })
    ).id;
    inactiveEmployeeId = (
      await db.user.create({
        data: {
          organisationId,
          email: `inactive-${crypto.randomUUID()}@example.com`,
          name: 'Inactive Employee',
          passwordHash,
          departmentId: taxDepartmentId,
          isActive: false,
        },
      })
    ).id;

    const client = await db.client.create({ data: { organisationId, name: 'ABC Group' } });
    clientId = client.id;
    const entity = await db.clientEntity.create({
      data: { organisationId, clientId, name: 'ABC Private Limited' },
    });
    entityId = entity.id;
    const service = await db.service.create({
      data: { organisationId, name: 'GST Filing', departmentId: taxDepartmentId },
    });
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

  async function createAwaitingAllocationTask(title: string) {
    const task = await db.task.create({
      data: {
        organisationId,
        taskNumber: `TASK-ASSIGN-TEST-${crypto.randomUUID()}`,
        clientId,
        clientEntityId: entityId,
        departmentId: taxDepartmentId,
        serviceId,
        title,
        status: 'AWAITING_ALLOCATION',
      },
    });
    return task;
  }

  function post(taskId: string, employeeId: string, sessionId?: string) {
    return POST(
      new NextRequest(`http://localhost/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
        body: JSON.stringify({ employeeId }),
      }),
      { params: Promise.resolve({ id: taskId }) },
    );
  }

  it('assigns an eligible, active, same-department employee and moves the task to ASSIGNED', async () => {
    const task = await createAwaitingAllocationTask('Assign happy path');
    const response = await post(task.id, eligibleEmployeeId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.task.assignedToId).toBe(eligibleEmployeeId);
    expect(body.task.status).toBe('ASSIGNED');

    const history = await db.taskStatusHistory.findFirst({ where: { taskId: task.id } });
    expect(history?.succeeded).toBe(true);
    expect(history?.toStatus).toBe('ASSIGNED');
  });

  it('rejects an employee from a different department', async () => {
    const task = await createAwaitingAllocationTask('Wrong department');
    const response = await post(task.id, wrongDepartmentEmployeeId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('EMPLOYEE_INELIGIBLE');
  });

  it('rejects an inactive employee', async () => {
    const task = await createAwaitingAllocationTask('Inactive employee');
    const response = await post(task.id, inactiveEmployeeId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('EMPLOYEE_INACTIVE');
  });

  it('rejects assigning a task that is not in AWAITING_ALLOCATION', async () => {
    const task = await db.task.create({
      data: {
        organisationId,
        taskNumber: `TASK-ASSIGN-TEST-${crypto.randomUUID()}`,
        clientId,
        clientEntityId: entityId,
        departmentId: taxDepartmentId,
        serviceId,
        title: 'Still new',
      },
    });
    const response = await post(task.id, eligibleEmployeeId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_TRANSITION');
  });

  it('rejects assigning a task that is already assigned', async () => {
    const task = await createAwaitingAllocationTask('Double assign');
    await post(task.id, eligibleEmployeeId, partnerSessionId);

    const secondEmployee = await db.user.create({
      data: {
        organisationId,
        email: `second-${crypto.randomUUID()}@example.com`,
        name: 'Second Employee',
        passwordHash: await hashPassword('irrelevant'),
        departmentId: taxDepartmentId,
      },
    });

    const response = await post(task.id, secondEmployee.id, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('ALREADY_ASSIGNED');
  });

  it('returns 403 assigning a task as a Preparer', async () => {
    const task = await createAwaitingAllocationTask('Preparer forbidden');
    const response = await post(task.id, eligibleEmployeeId, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 assigning a task while logged out', async () => {
    const task = await createAwaitingAllocationTask('Logged out');
    const response = await post(task.id, eligibleEmployeeId);
    expect(response.status).toBe(401);
  });

  it('returns 404 for a task that does not exist', async () => {
    const response = await post(
      '00000000-0000-0000-0000-000000000000',
      eligibleEmployeeId,
      partnerSessionId,
    );
    expect(response.status).toBe(404);
  });
});
