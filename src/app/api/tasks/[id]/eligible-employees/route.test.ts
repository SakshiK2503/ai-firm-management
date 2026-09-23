import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';
import { GET } from './route';

describe('/api/tasks/[id]/eligible-employees', () => {
  let organisationId: string;
  let partnerSessionId: string;
  let preparerSessionId: string;
  let taskWithDepartmentId: string;
  let taskWithoutDepartmentId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Eligible Employees Route Test ${crypto.randomUUID()}` },
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

    const taxDepartment = await db.department.create({
      data: { organisationId, name: 'Taxation' },
    });
    const auditDepartment = await db.department.create({
      data: { organisationId, name: 'Audit' },
    });

    await db.user.create({
      data: {
        organisationId,
        email: `tax-active-${crypto.randomUUID()}@example.com`,
        name: 'Tax Active Employee',
        passwordHash,
        departmentId: taxDepartment.id,
      },
    });
    await db.user.create({
      data: {
        organisationId,
        email: `tax-inactive-${crypto.randomUUID()}@example.com`,
        name: 'Tax Inactive Employee',
        passwordHash,
        departmentId: taxDepartment.id,
        isActive: false,
      },
    });
    await db.user.create({
      data: {
        organisationId,
        email: `audit-active-${crypto.randomUUID()}@example.com`,
        name: 'Audit Active Employee',
        passwordHash,
        departmentId: auditDepartment.id,
      },
    });

    const client = await db.client.create({ data: { organisationId, name: 'ABC Group' } });
    const entity = await db.clientEntity.create({
      data: { organisationId, clientId: client.id, name: 'ABC Private Limited' },
    });
    const serviceWithDepartment = await db.service.create({
      data: { organisationId, name: 'GST Filing', departmentId: taxDepartment.id },
    });
    const serviceWithoutDepartment = await db.service.create({
      data: { organisationId, name: 'General Advisory' },
    });
    await db.engagement.createMany({
      data: [
        {
          organisationId,
          clientEntityId: entity.id,
          serviceId: serviceWithDepartment.id,
          engagementStart: new Date('2026-01-01'),
          billingStructure: 'MONTHLY',
        },
        {
          organisationId,
          clientEntityId: entity.id,
          serviceId: serviceWithoutDepartment.id,
          engagementStart: new Date('2026-01-01'),
          billingStructure: 'MONTHLY',
        },
      ],
    });

    taskWithDepartmentId = (
      await db.task.create({
        data: {
          organisationId,
          taskNumber: `TASK-ELIGIBLE-TEST-${crypto.randomUUID()}`,
          clientId: client.id,
          clientEntityId: entity.id,
          departmentId: taxDepartment.id,
          serviceId: serviceWithDepartment.id,
          title: 'Department-scoped task',
        },
      })
    ).id;
    taskWithoutDepartmentId = (
      await db.task.create({
        data: {
          organisationId,
          taskNumber: `TASK-ELIGIBLE-TEST-${crypto.randomUUID()}`,
          clientId: client.id,
          clientEntityId: entity.id,
          serviceId: serviceWithoutDepartment.id,
          title: 'No department task',
        },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  function get(taskId: string, sessionId?: string) {
    return GET(
      new NextRequest(`http://localhost/api/tasks/${taskId}/eligible-employees`, {
        headers: sessionId ? { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` } : undefined,
      }),
      { params: Promise.resolve({ id: taskId }) },
    );
  }

  it('lists only active employees in the task department', async () => {
    const response = await get(taskWithDepartmentId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    const names = body.employees.map((e: { name: string }) => e.name);
    expect(names).toContain('Tax Active Employee');
    expect(names).not.toContain('Tax Inactive Employee');
    expect(names).not.toContain('Audit Active Employee');
  });

  it('lists every active employee when the task has no department', async () => {
    const response = await get(taskWithoutDepartmentId, partnerSessionId);
    const body = await response.json();

    expect(response.status).toBe(200);
    const names = body.employees.map((e: { name: string }) => e.name);
    expect(names).toContain('Tax Active Employee');
    expect(names).toContain('Audit Active Employee');
    expect(names).not.toContain('Tax Inactive Employee');
  });

  it('returns 403 as a Preparer', async () => {
    const response = await get(taskWithDepartmentId, preparerSessionId);
    expect(response.status).toBe(403);
  });

  it('returns 401 while logged out', async () => {
    const response = await get(taskWithDepartmentId);
    expect(response.status).toBe(401);
  });

  it('returns 404 for a task that does not exist', async () => {
    const response = await get('00000000-0000-0000-0000-000000000000', partnerSessionId);
    expect(response.status).toBe(404);
  });
});
