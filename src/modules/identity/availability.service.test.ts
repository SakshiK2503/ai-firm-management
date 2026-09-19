import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { createAvailability, deleteAvailability, listAvailability } from './availability.service';

describe('availability service', () => {
  let organisationId: string;
  let employeeId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Availability Service Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    employeeId = (
      await db.user.create({
        data: {
          organisationId,
          email: `person-${crypto.randomUUID()}@example.com`,
          name: 'Test Person',
          passwordHash: await hashPassword('irrelevant'),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('creates a leave record for an employee', async () => {
    const record = await createAvailability(organisationId, {
      userId: employeeId,
      type: 'LEAVE',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-05'),
      reason: 'Diwali break',
    });

    expect(record.type).toBe('LEAVE');
    expect(record.reason).toBe('Diwali break');
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      createAvailability(organisationId, {
        userId: employeeId,
        type: 'SICK',
        startDate: new Date('2026-11-10'),
        endDate: new Date('2026-11-05'),
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DATE_RANGE' });
  });

  it('rejects a period that overlaps an existing one for the same employee', async () => {
    await createAvailability(organisationId, {
      userId: employeeId,
      type: 'LEAVE',
      startDate: new Date('2026-12-01'),
      endDate: new Date('2026-12-10'),
    });

    // Fully overlapping
    await expect(
      createAvailability(organisationId, {
        userId: employeeId,
        type: 'SICK',
        startDate: new Date('2026-12-05'),
        endDate: new Date('2026-12-06'),
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'OVERLAPPING_PERIOD' });

    // Partial overlap at the edge
    await expect(
      createAvailability(organisationId, {
        userId: employeeId,
        type: 'SICK',
        startDate: new Date('2026-12-10'),
        endDate: new Date('2026-12-15'),
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'OVERLAPPING_PERIOD' });

    // Non-overlapping, right after, should succeed
    const after = await createAvailability(organisationId, {
      userId: employeeId,
      type: 'SICK',
      startDate: new Date('2026-12-11'),
      endDate: new Date('2026-12-12'),
    });
    expect(after.startDate).toEqual(new Date('2026-12-11'));
  });

  it('rejects an unknown employee', async () => {
    await expect(
      createAvailability(organisationId, {
        userId: '00000000-0000-0000-0000-000000000000',
        type: 'LEAVE',
        startDate: new Date('2027-01-01'),
        endDate: new Date('2027-01-02'),
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('lists availability for an employee, most recent first', async () => {
    const records = await listAvailability(organisationId, employeeId);
    expect(records.length).toBeGreaterThan(0);
    for (let i = 1; i < records.length; i++) {
      expect(records[i - 1].startDate.getTime()).toBeGreaterThanOrEqual(
        records[i].startDate.getTime(),
      );
    }
  });

  it('deletes an availability record, and 404s deleting one that does not exist', async () => {
    const record = await createAvailability(organisationId, {
      userId: employeeId,
      type: 'UNAVAILABLE',
      startDate: new Date('2027-02-01'),
      endDate: new Date('2027-02-02'),
    });

    await deleteAvailability(organisationId, record.id);

    await expect(deleteAvailability(organisationId, record.id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
