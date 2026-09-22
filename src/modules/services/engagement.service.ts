import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';
import { assertEntityBelongsToClient } from '@/modules/clients/entity.service';
import { assertServiceAssignable } from './service.service';

const ENGAGEMENT_SELECT = {
  id: true,
  clientEntityId: true,
  serviceId: true,
  engagementStart: true,
  billingStructure: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  service: { select: { id: true, name: true, isActive: true } },
};

export interface EngagementInput {
  serviceId: string;
  engagementStart: Date;
  billingStructure: 'MONTHLY' | 'ASSIGNMENT';
}

export async function createEngagement(
  organisationId: string,
  clientId: string,
  entityId: string,
  input: EngagementInput,
) {
  await assertEntityBelongsToClient(organisationId, clientId, entityId);
  await assertServiceAssignable(organisationId, input.serviceId);

  try {
    return await db.engagement.create({
      data: { organisationId, clientEntityId: entityId, ...input },
      select: ENGAGEMENT_SELECT,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(
        409,
        'CONFLICT',
        'This entity is already engaged for this service. Reactivate the existing engagement instead.',
      );
    }
    throw error;
  }
}

export async function listEngagementsForEntity(
  organisationId: string,
  clientId: string,
  entityId: string,
) {
  await assertEntityBelongsToClient(organisationId, clientId, entityId);

  return db.engagement.findMany({
    where: { organisationId, clientEntityId: entityId },
    select: ENGAGEMENT_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateEngagement(
  organisationId: string,
  clientId: string,
  entityId: string,
  engagementId: string,
  data: { engagementStart?: Date; billingStructure?: 'MONTHLY' | 'ASSIGNMENT'; isActive?: boolean },
) {
  await assertEntityBelongsToClient(organisationId, clientId, entityId);

  const existing = await db.engagement.findFirst({
    where: { id: engagementId, organisationId, clientEntityId: entityId },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Engagement not found.');
  }

  // Reactivating a terminated engagement should still confirm the service wasn't disabled in
  // the meantime - the same rule Day 39 already enforces for a brand new engagement.
  if (data.isActive) {
    await assertServiceAssignable(organisationId, existing.serviceId);
  }

  return db.engagement.update({
    where: { id: engagementId },
    data,
    select: ENGAGEMENT_SELECT,
  });
}

// Task creation's "client/entity/service validation" (Day 44) needs more than each id existing -
// a task should represent real, currently-engaged client work. Confirms the entity is actually
// engaged for the service, and that engagement hasn't been terminated.
export async function assertEngagementActive(
  organisationId: string,
  entityId: string,
  serviceId: string,
) {
  const engagement = await db.engagement.findFirst({
    where: { organisationId, clientEntityId: entityId, serviceId },
  });
  if (!engagement) {
    throw new ApiError(
      400,
      'NO_ENGAGEMENT',
      'This entity has no engagement for this service. Create one first.',
    );
  }
  if (!engagement.isActive) {
    throw new ApiError(
      400,
      'ENGAGEMENT_TERMINATED',
      'This engagement has been terminated. Reactivate it before creating a task against it.',
    );
  }
}
