import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';

export async function createDepartment(organisationId: string, name: string) {
  try {
    return await db.department.create({ data: { organisationId, name } });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', `A department named "${name}" already exists.`);
    }
    throw error;
  }
}

export async function listDepartments(
  organisationId: string,
  options: { search?: string; includeInactive?: boolean } = {},
) {
  return db.department.findMany({
    where: {
      organisationId,
      ...(options.search ? { name: { contains: options.search, mode: 'insensitive' } } : {}),
      ...(options.includeInactive ? {} : { isActive: true }),
    },
    orderBy: { name: 'asc' },
  });
}

export async function updateDepartment(
  organisationId: string,
  departmentId: string,
  data: { name?: string; isActive?: boolean },
) {
  const existing = await db.department.findFirst({
    where: { id: departmentId, organisationId },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Department not found.');
  }

  try {
    return await db.department.update({ where: { id: departmentId }, data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', `A department named "${data.name}" already exists.`);
    }
    throw error;
  }
}
