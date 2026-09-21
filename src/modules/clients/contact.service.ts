import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';

async function assertEntityExists(organisationId: string, entityId: string) {
  const entity = await db.clientEntity.findFirst({ where: { id: entityId, organisationId } });
  if (!entity) {
    throw new ApiError(400, 'INVALID_ENTITY', 'Entity not found.');
  }
}

const CONTACT_SELECT = {
  id: true,
  entityId: true,
  name: true,
  designation: true,
  phone: true,
  email: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
};

export interface ContactInput {
  entityId: string;
  name: string;
  designation?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

// At most one primary contact per entity. Rather than rejecting a second "primary" outright,
// setting one clears any existing primary for that entity first - matches how a "default" flag
// is normally expected to behave (like a default payment method), not a hard uniqueness
// conflict the caller has to resolve manually first.
export async function createContact(organisationId: string, input: ContactInput) {
  await assertEntityExists(organisationId, input.entityId);

  try {
    return await db.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.contact.updateMany({
          where: { entityId: input.entityId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.contact.create({ data: { organisationId, ...input }, select: CONTACT_SELECT });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(
        409,
        'CONFLICT',
        `A contact named "${input.name}" already exists for this entity.`,
      );
    }
    throw error;
  }
}

export async function listContactsForEntity(organisationId: string, entityId: string) {
  await assertEntityExists(organisationId, entityId);

  return db.contact.findMany({
    where: { organisationId, entityId },
    select: CONTACT_SELECT,
    orderBy: { name: 'asc' },
  });
}

export async function updateContact(
  organisationId: string,
  contactId: string,
  input: {
    name?: string;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
    isPrimary?: boolean;
  },
) {
  const existing = await db.contact.findFirst({ where: { id: contactId, organisationId } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Contact not found.');
  }

  try {
    return await db.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.contact.updateMany({
          where: { entityId: existing.entityId, isPrimary: true, id: { not: contactId } },
          data: { isPrimary: false },
        });
      }
      return tx.contact.update({ where: { id: contactId }, data: input, select: CONTACT_SELECT });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(
        409,
        'CONFLICT',
        `A contact named "${input.name}" already exists for this entity.`,
      );
    }
    throw error;
  }
}

export async function deleteContact(organisationId: string, contactId: string) {
  const existing = await db.contact.findFirst({ where: { id: contactId, organisationId } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Contact not found.');
  }
  await db.contact.delete({ where: { id: contactId } });
}
