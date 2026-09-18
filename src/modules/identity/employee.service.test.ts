import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { createEmployee, getEmployee, listEmployees, updateEmployee } from './employee.service';

describe('employee service', () => {
  let organisationId: string;
  let activeDepartmentId: string;
  let disabledDepartmentId: string;
  let roleId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Employee Service Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    activeDepartmentId = (
      await db.department.create({ data: { organisationId, name: 'Accounts' } })
    ).id;
    disabledDepartmentId = (
      await db.department.create({
        data: { organisationId, name: 'Legacy', isActive: false },
      })
    ).id;
    roleId = (await db.role.create({ data: { organisationId, name: 'Preparer' } })).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('creates an employee with department and role assigned, never returning the password hash', async () => {
    const employee = await createEmployee(organisationId, {
      email: `person-${crypto.randomUUID()}@example.com`,
      name: 'Test Person',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });

    expect(employee.department?.id).toBe(activeDepartmentId);
    expect(employee.role?.id).toBe(roleId);
    expect(employee).not.toHaveProperty('passwordHash');
  });

  it('rejects a duplicate email in the same organisation', async () => {
    const email = `dup-${crypto.randomUUID()}@example.com`;
    await createEmployee(organisationId, {
      email,
      name: 'First',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });

    await expect(
      createEmployee(organisationId, {
        email,
        name: 'Second',
        password: 'a-strong-password',
        departmentId: activeDepartmentId,
        roleId,
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('rejects assigning an employee to a disabled department (closes the Day 19 gap)', async () => {
    await expect(
      createEmployee(organisationId, {
        email: `person-${crypto.randomUUID()}@example.com`,
        name: 'Test Person',
        password: 'a-strong-password',
        departmentId: disabledDepartmentId,
        roleId,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'DEPARTMENT_DISABLED' });
  });

  it('rejects an unknown department or role', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await expect(
      createEmployee(organisationId, {
        email: `person-${crypto.randomUUID()}@example.com`,
        name: 'Test Person',
        password: 'a-strong-password',
        departmentId: fakeId,
        roleId,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DEPARTMENT' });

    await expect(
      createEmployee(organisationId, {
        email: `person-${crypto.randomUUID()}@example.com`,
        name: 'Test Person',
        password: 'a-strong-password',
        departmentId: activeDepartmentId,
        roleId: fakeId,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ROLE' });
  });

  it('lists employees, filters inactive, and searches by name or email', async () => {
    const emailFragment = crypto.randomUUID();
    const employee = await createEmployee(organisationId, {
      email: `findme-${emailFragment}@example.com`,
      name: 'Findable Person',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });
    await updateEmployee(organisationId, employee.id, { isActive: false });

    const active = await listEmployees(organisationId);
    expect(active.some((e) => e.id === employee.id)).toBe(false);

    const all = await listEmployees(organisationId, { includeInactive: true });
    expect(all.some((e) => e.id === employee.id)).toBe(true);

    const byName = await listEmployees(organisationId, {
      search: 'Findable',
      includeInactive: true,
    });
    expect(byName.map((e) => e.id)).toContain(employee.id);

    const byEmail = await listEmployees(organisationId, {
      search: emailFragment,
      includeInactive: true,
    });
    expect(byEmail.map((e) => e.id)).toContain(employee.id);
  });

  it('gets a single employee and 404s for one that does not exist', async () => {
    const employee = await createEmployee(organisationId, {
      email: `single-${crypto.randomUUID()}@example.com`,
      name: 'Single Person',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });

    const found = await getEmployee(organisationId, employee.id);
    expect(found.name).toBe('Single Person');

    await expect(
      getEmployee(organisationId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('updates name, department, role, and active status', async () => {
    const employee = await createEmployee(organisationId, {
      email: `update-${crypto.randomUUID()}@example.com`,
      name: 'Before Update',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });

    const updated = await updateEmployee(organisationId, employee.id, {
      name: 'After Update',
      isActive: false,
    });

    expect(updated.name).toBe('After Update');
    expect(updated.isActive).toBe(false);
  });

  it('rejects moving an employee to a disabled department', async () => {
    const employee = await createEmployee(organisationId, {
      email: `move-${crypto.randomUUID()}@example.com`,
      name: 'Move Me',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });

    await expect(
      updateEmployee(organisationId, employee.id, { departmentId: disabledDepartmentId }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'DEPARTMENT_DISABLED' });
  });

  it('assigns a manager on create and on update, and rejects an unknown manager', async () => {
    const manager = await createEmployee(organisationId, {
      email: `manager-${crypto.randomUUID()}@example.com`,
      name: 'Manager Person',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });

    const report = await createEmployee(organisationId, {
      email: `report-${crypto.randomUUID()}@example.com`,
      name: 'Report Person',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
      managerId: manager.id,
    });
    expect(report.manager?.id).toBe(manager.id);

    const reassigned = await updateEmployee(organisationId, report.id, { managerId: null });
    expect(reassigned.manager).toBeNull();

    await expect(
      updateEmployee(organisationId, report.id, {
        managerId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_MANAGER' });
  });

  it('rejects an employee being their own manager', async () => {
    const employee = await createEmployee(organisationId, {
      email: `self-${crypto.randomUUID()}@example.com`,
      name: 'Self Reporter',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });

    await expect(
      updateEmployee(organisationId, employee.id, { managerId: employee.id }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_MANAGER' });
  });

  it('rejects a reporting chain that would form a cycle', async () => {
    const a = await createEmployee(organisationId, {
      email: `a-${crypto.randomUUID()}@example.com`,
      name: 'A',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
    });
    const b = await createEmployee(organisationId, {
      email: `b-${crypto.randomUUID()}@example.com`,
      name: 'B',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
      managerId: a.id,
    });
    const c = await createEmployee(organisationId, {
      email: `c-${crypto.randomUUID()}@example.com`,
      name: 'C',
      password: 'a-strong-password',
      departmentId: activeDepartmentId,
      roleId,
      managerId: b.id,
    });

    // Reporting chain is C -> B -> A (C reports to B, B reports to A).
    // Direct cycle: B already reports to A, so A reporting to B is a 2-node loop.
    await expect(updateEmployee(organisationId, a.id, { managerId: b.id })).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_MANAGER',
    });

    // Longer cycle: A reporting to C would close the loop A -> C -> B -> A.
    await expect(updateEmployee(organisationId, a.id, { managerId: c.id })).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_MANAGER',
    });
  });
});
