import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';
import type { SkillLevel } from '@/generated/prisma/client';

export interface ServiceInput {
  name: string;
  parentId?: string | null;
  departmentId?: string | null;
  expectedSkillLevel?: SkillLevel | null;
  turnaroundDays?: number | null;
  estimatedEffortMinHours?: number | null;
  estimatedEffortMaxHours?: number | null;
  reviewRequired?: boolean;
  isRecurring?: boolean;
  standardDocuments?: string | null;
}

const SERVICE_SELECT = {
  id: true,
  name: true,
  parentId: true,
  departmentId: true,
  expectedSkillLevel: true,
  turnaroundDays: true,
  estimatedEffortMinHours: true,
  estimatedEffortMaxHours: true,
  reviewRequired: true,
  isRecurring: true,
  standardDocuments: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
};

// Self-referential like User.managerId (Day 24) - same cycle-prevention shape: walk up from the
// proposed parent looking for the service being reparented, since Postgres FKs can't express
// "no cycles."
async function assertParentValid(organisationId: string, parentId: string, childId?: string) {
  const parent = await db.service.findFirst({ where: { id: parentId, organisationId } });
  if (!parent) {
    throw new ApiError(400, 'INVALID_PARENT', 'Parent service not found.');
  }
  if (!childId) return;

  if (parentId === childId) {
    throw new ApiError(400, 'INVALID_PARENT', 'A service cannot be its own parent.');
  }

  const visited = new Set<string>();
  let currentId: string | null = parentId;
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    if (currentId === childId) {
      throw new ApiError(400, 'INVALID_PARENT', 'This would create a circular service hierarchy.');
    }
    const current: { parentId: string | null } | null = await db.service.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

async function assertDepartmentValid(organisationId: string, departmentId: string) {
  const department = await db.department.findFirst({ where: { id: departmentId, organisationId } });
  if (!department) {
    throw new ApiError(400, 'INVALID_DEPARTMENT', 'Department not found.');
  }
}

// Name uniqueness is scoped to the parent (a category and its children, or the top level for
// parentId null), not the whole org - two different categories can each have a "Notice" child,
// e.g. "GST Notice" under Taxation vs a hypothetical "Notice" under MCA. Checked explicitly
// rather than relying solely on the @@unique index, since Postgres treats every NULL in a
// unique index as distinct and wouldn't catch two top-level services sharing a name.
async function assertNameAvailable(
  organisationId: string,
  parentId: string | null,
  name: string,
  excludeId?: string,
) {
  const existing = await db.service.findFirst({
    where: { organisationId, parentId, name, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (existing) {
    throw new ApiError(
      409,
      'CONFLICT',
      `A service named "${name}" already exists ${parentId ? 'under this category' : 'at the top level'}.`,
    );
  }
}

export async function createService(organisationId: string, input: ServiceInput) {
  if (input.parentId) {
    await assertParentValid(organisationId, input.parentId);
  }
  if (input.departmentId) {
    await assertDepartmentValid(organisationId, input.departmentId);
  }
  await assertNameAvailable(organisationId, input.parentId ?? null, input.name);

  try {
    return await db.service.create({
      data: { organisationId, ...input },
      select: SERVICE_SELECT,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', `A service named "${input.name}" already exists.`);
    }
    throw error;
  }
}

interface ServiceTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  department: { id: string; name: string } | null;
  children: ServiceTreeNode[];
}

export async function listServiceTree(
  organisationId: string,
  options: { includeInactive?: boolean } = {},
): Promise<ServiceTreeNode[]> {
  const services = await db.service.findMany({
    where: { organisationId, ...(options.includeInactive ? {} : { isActive: true }) },
    select: {
      id: true,
      name: true,
      parentId: true,
      isActive: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const byId = new Map<string, ServiceTreeNode>(
    services.map((service) => [service.id, { ...service, children: [] }]),
  );
  const roots: ServiceTreeNode[] = [];
  for (const service of byId.values()) {
    const parent = service.parentId ? byId.get(service.parentId) : undefined;
    if (parent) {
      parent.children.push(service);
    } else {
      roots.push(service);
    }
  }
  return roots;
}

export async function getService(organisationId: string, serviceId: string) {
  const service = await db.service.findFirst({
    where: { id: serviceId, organisationId },
    select: SERVICE_SELECT,
  });
  if (!service) {
    throw new ApiError(404, 'NOT_FOUND', 'Service not found.');
  }
  return service;
}

// Closes Day 39's own acceptance check ("disabled service cannot be newly assigned") - Day 35
// (Engagements) calls this once it links a service to a client entity.
export async function assertServiceAssignable(organisationId: string, serviceId: string) {
  const service = await db.service.findFirst({ where: { id: serviceId, organisationId } });
  if (!service) {
    throw new ApiError(400, 'INVALID_SERVICE', 'Service not found.');
  }
  if (!service.isActive) {
    throw new ApiError(400, 'SERVICE_DISABLED', 'Cannot assign a disabled service.');
  }
}

export async function updateService(
  organisationId: string,
  serviceId: string,
  data: Partial<ServiceInput> & { isActive?: boolean },
) {
  const existing = await db.service.findFirst({ where: { id: serviceId, organisationId } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Service not found.');
  }

  if (data.parentId) {
    await assertParentValid(organisationId, data.parentId, serviceId);
  }
  if (data.departmentId) {
    await assertDepartmentValid(organisationId, data.departmentId);
  }
  if (data.name) {
    const nextParentId = data.parentId !== undefined ? data.parentId : existing.parentId;
    await assertNameAvailable(organisationId, nextParentId, data.name, serviceId);
  }

  try {
    return await db.service.update({ where: { id: serviceId }, data, select: SERVICE_SELECT });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', `A service named "${data.name}" already exists.`);
    }
    throw error;
  }
}
