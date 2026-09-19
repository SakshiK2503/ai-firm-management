import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import type { AvailabilityType } from '@/generated/prisma/client';

async function assertEmployeeExists(organisationId: string, userId: string) {
  const employee = await db.user.findFirst({ where: { id: userId, organisationId } });
  if (!employee) {
    throw new ApiError(404, 'NOT_FOUND', 'Employee not found.');
  }
}

// "Unavailable employee rules enforced" (Day 27's own acceptance check), scoped to what's
// actually checkable today: the record itself has to be internally consistent. There's no Task
// table yet to check this availability against, so that's explicitly out of scope here - see
// the Availability schema comment.
async function assertValidPeriod(
  organisationId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
) {
  if (startDate > endDate) {
    throw new ApiError(400, 'INVALID_DATE_RANGE', 'Start date must be on or before the end date.');
  }

  const overlapping = await db.availability.findFirst({
    where: {
      organisationId,
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  if (overlapping) {
    throw new ApiError(
      409,
      'OVERLAPPING_PERIOD',
      'This period overlaps an existing availability record for this employee.',
    );
  }
}

export async function createAvailability(
  organisationId: string,
  input: {
    userId: string;
    type: AvailabilityType;
    startDate: Date;
    endDate: Date;
    reason?: string;
  },
) {
  await assertEmployeeExists(organisationId, input.userId);
  await assertValidPeriod(organisationId, input.userId, input.startDate, input.endDate);

  return db.availability.create({
    data: {
      organisationId,
      userId: input.userId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
    },
  });
}

export async function listAvailability(organisationId: string, userId: string) {
  await assertEmployeeExists(organisationId, userId);

  return db.availability.findMany({
    where: { organisationId, userId },
    orderBy: { startDate: 'desc' },
  });
}

export async function deleteAvailability(organisationId: string, availabilityId: string) {
  const existing = await db.availability.findFirst({
    where: { id: availabilityId, organisationId },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Availability record not found.');
  }
  await db.availability.delete({ where: { id: availabilityId } });
}
