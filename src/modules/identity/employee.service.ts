import type { Prisma } from '@/generated/prisma/client';
import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';
import { hashPassword } from '@/modules/kernel/auth/password';

// `select` (not `include`) everywhere here, deliberately - passwordHash is never even fetched,
// not just stripped from the response afterward.
const EMPLOYEE_SELECT = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  role: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

async function assertDepartmentAssignable(organisationId: string, departmentId: string) {
  const department = await db.department.findFirst({ where: { id: departmentId, organisationId } });
  if (!department) {
    throw new ApiError(400, 'INVALID_DEPARTMENT', 'Department not found.');
  }
  // Closes the Day 19 gap: a disabled department shouldn't receive new work, and a new
  // employee assignment is exactly that.
  if (!department.isActive) {
    throw new ApiError(
      400,
      'DEPARTMENT_DISABLED',
      'Cannot assign an employee to a disabled department.',
    );
  }
}

async function assertRoleExists(organisationId: string, roleId: string) {
  const role = await db.role.findFirst({ where: { id: roleId, organisationId } });
  if (!role) {
    throw new ApiError(400, 'INVALID_ROLE', 'Role not found.');
  }
}

// Prevents both direct self-reporting (managerId === own id) and longer cycles (assigning a
// manager who, walking up their own chain, eventually reports back to the employee being
// updated). Employee creation never needs this walk since a brand-new employee can't yet be
// anyone's manager.
async function assertManagerAssignable(
  organisationId: string,
  employeeId: string | null,
  managerId: string,
) {
  const manager = await db.user.findFirst({ where: { id: managerId, organisationId } });
  if (!manager) {
    throw new ApiError(400, 'INVALID_MANAGER', 'Manager not found.');
  }
  if (employeeId === null) {
    return;
  }
  if (managerId === employeeId) {
    throw new ApiError(400, 'INVALID_MANAGER', 'An employee cannot be their own manager.');
  }

  const visited = new Set<string>();
  let currentId: string | null = managerId;
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    if (currentId === employeeId) {
      throw new ApiError(
        400,
        'INVALID_MANAGER',
        'This assignment would create a circular reporting chain.',
      );
    }
    const current: { managerId: string | null } | null = await db.user.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });
    currentId = current?.managerId ?? null;
  }
}

export async function createEmployee(
  organisationId: string,
  input: {
    email: string;
    name: string;
    password: string;
    departmentId: string;
    roleId: string;
    managerId?: string;
  },
) {
  await assertDepartmentAssignable(organisationId, input.departmentId);
  await assertRoleExists(organisationId, input.roleId);
  if (input.managerId) {
    await assertManagerAssignable(organisationId, null, input.managerId);
  }

  try {
    return await db.user.create({
      data: {
        organisationId,
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        departmentId: input.departmentId,
        roleId: input.roleId,
        managerId: input.managerId ?? null,
      },
      select: EMPLOYEE_SELECT,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(
        409,
        'CONFLICT',
        `An employee with email "${input.email}" already exists.`,
      );
    }
    throw error;
  }
}

export async function listEmployees(
  organisationId: string,
  options: { search?: string; includeInactive?: boolean } = {},
) {
  return db.user.findMany({
    where: {
      organisationId,
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { email: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(options.includeInactive ? {} : { isActive: true }),
    },
    select: EMPLOYEE_SELECT,
    orderBy: { name: 'asc' },
  });
}

export async function getEmployee(organisationId: string, employeeId: string) {
  const employee = await db.user.findFirst({
    where: { id: employeeId, organisationId },
    select: EMPLOYEE_SELECT,
  });
  if (!employee) {
    throw new ApiError(404, 'NOT_FOUND', 'Employee not found.');
  }
  return employee;
}

export async function updateEmployee(
  organisationId: string,
  employeeId: string,
  data: {
    name?: string;
    departmentId?: string;
    roleId?: string;
    isActive?: boolean;
    managerId?: string | null;
  },
) {
  const existing = await db.user.findFirst({ where: { id: employeeId, organisationId } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Employee not found.');
  }

  if (data.departmentId) {
    await assertDepartmentAssignable(organisationId, data.departmentId);
  }
  if (data.roleId) {
    await assertRoleExists(organisationId, data.roleId);
  }
  // `null` clears the manager - always safe, no cycle to check. A string reassigns it and needs
  // the cycle walk; `undefined` (key omitted) leaves it untouched.
  if (data.managerId) {
    await assertManagerAssignable(organisationId, employeeId, data.managerId);
  }

  return db.user.update({ where: { id: employeeId }, data, select: EMPLOYEE_SELECT });
}
