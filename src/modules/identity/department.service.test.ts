import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { createDepartment, listDepartments, updateDepartment } from './department.service';

describe('department service', () => {
  let organisationId: string;
  let otherOrganisationId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Department Service Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    const otherOrganisation = await db.organisation.create({
      data: { name: `Other Org ${crypto.randomUUID()}` },
    });
    otherOrganisationId = otherOrganisation.id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.organisation.delete({ where: { id: otherOrganisationId } });
    await db.$disconnect();
  });

  it('creates a department', async () => {
    const department = await createDepartment(organisationId, 'Accounts');
    expect(department.name).toBe('Accounts');
    expect(department.isActive).toBe(true);
  });

  it('rejects a duplicate department name in the same organisation', async () => {
    await createDepartment(organisationId, 'Audit');

    await expect(createDepartment(organisationId, 'Audit')).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('allows the same department name in a different organisation', async () => {
    await createDepartment(organisationId, 'Tax');
    const department = await createDepartment(otherOrganisationId, 'Tax');
    expect(department.name).toBe('Tax');
  });

  it('lists only active departments by default, and can search by name', async () => {
    await createDepartment(organisationId, 'Marketing');
    const disabled = await createDepartment(organisationId, 'Legacy');
    await updateDepartment(organisationId, disabled.id, { isActive: false });

    const active = await listDepartments(organisationId);
    expect(active.some((d) => d.name === 'Legacy')).toBe(false);

    const all = await listDepartments(organisationId, { includeInactive: true });
    expect(all.some((d) => d.name === 'Legacy')).toBe(true);

    const searched = await listDepartments(organisationId, { search: 'market' });
    expect(searched.map((d) => d.name)).toEqual(['Marketing']);
  });

  it('renames a department', async () => {
    const department = await createDepartment(organisationId, 'CRM');
    const renamed = await updateDepartment(organisationId, department.id, {
      name: 'Client Relations',
    });
    expect(renamed.name).toBe('Client Relations');
  });

  it('rejects renaming to a name that already exists in the same organisation', async () => {
    await createDepartment(organisationId, 'Existing Name');
    const department = await createDepartment(organisationId, 'To Rename');

    await expect(
      updateDepartment(organisationId, department.id, { name: 'Existing Name' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('disables and re-enables a department', async () => {
    const department = await createDepartment(organisationId, 'Toggle Test');

    const disabled = await updateDepartment(organisationId, department.id, { isActive: false });
    expect(disabled.isActive).toBe(false);

    const enabled = await updateDepartment(organisationId, department.id, { isActive: true });
    expect(enabled.isActive).toBe(true);
  });

  it('throws 404 for a department that does not exist', async () => {
    await expect(
      updateDepartment(organisationId, '00000000-0000-0000-0000-000000000000', {
        isActive: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('throws 404 when updating a department that belongs to a different organisation', async () => {
    const department = await createDepartment(otherOrganisationId, 'Other Org Dept');

    await expect(
      updateDepartment(organisationId, department.id, { isActive: false }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
