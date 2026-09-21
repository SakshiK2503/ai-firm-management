import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';

async function assertServiceExists(organisationId: string, serviceId: string) {
  const service = await db.service.findFirst({ where: { id: serviceId, organisationId } });
  if (!service) {
    throw new ApiError(400, 'INVALID_SERVICE', 'Service not found.');
  }
}

export async function getChecklistForService(organisationId: string, serviceId: string) {
  await assertServiceExists(organisationId, serviceId);
  return db.checklistTemplate.findFirst({
    where: { organisationId, serviceId },
    include: { items: { orderBy: { position: 'asc' } } },
  });
}

// One template per service (ChecklistTemplate.serviceId is @unique) - created with its
// starting set of item labels in one call, since a checklist with zero items isn't useful.
export async function createChecklistTemplate(
  organisationId: string,
  serviceId: string,
  name: string,
  itemLabels: string[],
) {
  await assertServiceExists(organisationId, serviceId);

  try {
    return await db.checklistTemplate.create({
      data: {
        organisationId,
        serviceId,
        name,
        items: {
          create: itemLabels.map((label, index) => ({ organisationId, label, position: index })),
        },
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', 'This service already has a checklist template.');
    }
    throw error;
  }
}

export async function addChecklistItem(organisationId: string, serviceId: string, label: string) {
  const template = await db.checklistTemplate.findFirst({ where: { organisationId, serviceId } });
  if (!template) {
    throw new ApiError(404, 'NOT_FOUND', 'This service has no checklist template yet.');
  }

  const count = await db.checklistItem.count({ where: { checklistTemplateId: template.id } });
  return db.checklistItem.create({
    data: { organisationId, checklistTemplateId: template.id, label, position: count },
  });
}

export async function removeChecklistItem(
  organisationId: string,
  serviceId: string,
  itemId: string,
) {
  const template = await db.checklistTemplate.findFirst({ where: { organisationId, serviceId } });
  if (!template) {
    throw new ApiError(404, 'NOT_FOUND', 'This service has no checklist template yet.');
  }

  const item = await db.checklistItem.findFirst({
    where: { id: itemId, checklistTemplateId: template.id },
  });
  if (!item) {
    throw new ApiError(404, 'NOT_FOUND', 'Checklist item not found.');
  }

  await db.checklistItem.delete({ where: { id: itemId } });
}
