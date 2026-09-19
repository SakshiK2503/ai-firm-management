import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';

const DEFAULT_PAGE_SIZE = 20;

export async function createClient(organisationId: string, name: string) {
  try {
    return await db.client.create({ data: { organisationId, name } });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', `A client named "${name}" already exists.`);
    }
    throw error;
  }
}

export async function listClients(
  organisationId: string,
  options: {
    search?: string;
    includeInactive?: boolean;
    // 'assigned' is a Preparer without client:viewAll. There's no Task/assignment table yet
    // (Task Engine is Day 44+), so there's no way to compute "clients assigned to me" - the
    // honest interim behaviour is an empty result, not firm-wide access. See docs/RBAC.md's
    // "known gaps" section.
    scope: 'all' | 'assigned';
    page?: number;
    pageSize?: number;
  },
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, options.pageSize ?? DEFAULT_PAGE_SIZE));

  if (options.scope === 'assigned') {
    return { clients: [], total: 0, page, pageSize };
  }

  const where = {
    organisationId,
    ...(options.search ? { name: { contains: options.search, mode: 'insensitive' as const } } : {}),
    ...(options.includeInactive ? {} : { isActive: true }),
  };

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.client.count({ where }),
  ]);

  return { clients, total, page, pageSize };
}

export async function getClient(organisationId: string, clientId: string) {
  const client = await db.client.findFirst({ where: { id: clientId, organisationId } });
  if (!client) {
    throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
  }
  return client;
}

export async function updateClient(
  organisationId: string,
  clientId: string,
  data: { name?: string; isActive?: boolean },
) {
  const existing = await db.client.findFirst({ where: { id: clientId, organisationId } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
  }

  try {
    return await db.client.update({ where: { id: clientId }, data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', `A client named "${data.name}" already exists.`);
    }
    throw error;
  }
}
