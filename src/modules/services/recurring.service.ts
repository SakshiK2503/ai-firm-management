import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';

const QUARTERLY_MONTHS = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct (0-indexed)

export type RecurrenceFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';

export interface RecurringConfigInput {
  frequency: RecurrenceFrequency;
  dayOfMonth: number;
  monthOfYear?: number | null;
}

function assertConfigValid(input: RecurringConfigInput) {
  if (input.dayOfMonth < 1 || input.dayOfMonth > 28) {
    throw new ApiError(
      400,
      'INVALID_DAY_OF_MONTH',
      'Day of month must be between 1 and 28 (every month can honor this date).',
    );
  }
  if (input.frequency === 'ANNUALLY') {
    if (!input.monthOfYear || input.monthOfYear < 1 || input.monthOfYear > 12) {
      throw new ApiError(
        400,
        'INVALID_MONTH_OF_YEAR',
        'An annual recurrence needs a month of year (1-12).',
      );
    }
  } else if (input.monthOfYear != null) {
    throw new ApiError(
      400,
      'INVALID_MONTH_OF_YEAR',
      'Month of year only applies to an annual recurrence.',
    );
  }
}

// Pure and side-effect-free so it can be unit-tested directly - the "generate a test recurring
// instance" acceptance check (Day 43) is exactly a call to this function, since actually creating
// a Task from it is Task Engine's job (Day 44+), not this baseline's.
export function computeNextOccurrence(
  config: { frequency: RecurrenceFrequency; dayOfMonth: number; monthOfYear: number | null },
  from: Date,
): Date {
  const eligibleMonths =
    config.frequency === 'MONTHLY'
      ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : config.frequency === 'QUARTERLY'
        ? QUARTERLY_MONTHS
        : [config.monthOfYear! - 1];

  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  for (let offset = 0; offset <= 12; offset += 1) {
    const candidateMonthIndex = from.getMonth() + offset;
    if (!eligibleMonths.includes(((candidateMonthIndex % 12) + 12) % 12)) continue;

    const candidate = new Date(from.getFullYear(), candidateMonthIndex, config.dayOfMonth);
    if (candidate >= fromMidnight) {
      return candidate;
    }
  }

  // Unreachable given every frequency has at least one eligible month within 12 months of `from`.
  throw new ApiError(500, 'INTERNAL_ERROR', 'Could not compute the next occurrence.');
}

const RECURRING_CONFIG_SELECT = {
  id: true,
  serviceId: true,
  frequency: true,
  dayOfMonth: true,
  monthOfYear: true,
  createdAt: true,
  updatedAt: true,
};

async function assertServiceIsRecurring(organisationId: string, serviceId: string) {
  const service = await db.service.findFirst({ where: { id: serviceId, organisationId } });
  if (!service) {
    throw new ApiError(400, 'INVALID_SERVICE', 'Service not found.');
  }
  if (!service.isRecurring) {
    throw new ApiError(
      400,
      'SERVICE_NOT_RECURRING',
      'Mark the service as recurring before configuring a recurrence calendar.',
    );
  }
}

export async function createRecurringConfig(
  organisationId: string,
  serviceId: string,
  input: RecurringConfigInput,
) {
  await assertServiceIsRecurring(organisationId, serviceId);
  assertConfigValid(input);

  try {
    return await db.recurringConfig.create({
      data: { organisationId, serviceId, ...input },
      select: RECURRING_CONFIG_SELECT,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', 'This service already has a recurrence calendar.');
    }
    throw error;
  }
}

export async function getRecurringConfig(organisationId: string, serviceId: string) {
  const config = await db.recurringConfig.findFirst({
    where: { organisationId, serviceId },
    select: RECURRING_CONFIG_SELECT,
  });
  if (!config) return null;
  return { ...config, nextOccurrence: computeNextOccurrence(config, new Date()) };
}

export async function updateRecurringConfig(
  organisationId: string,
  serviceId: string,
  input: RecurringConfigInput,
) {
  const existing = await db.recurringConfig.findFirst({ where: { organisationId, serviceId } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'This service has no recurrence calendar yet.');
  }
  assertConfigValid(input);

  const updated = await db.recurringConfig.update({
    where: { id: existing.id },
    data: input,
    select: RECURRING_CONFIG_SELECT,
  });
  return { ...updated, nextOccurrence: computeNextOccurrence(updated, new Date()) };
}
