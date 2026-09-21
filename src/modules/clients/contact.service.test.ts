import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import {
  createContact,
  deleteContact,
  listContactsForEntity,
  updateContact,
} from './contact.service';

describe('contact service', () => {
  let organisationId: string;
  let entityId: string;
  let otherEntityId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Contact Service Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    const client = await db.client.create({ data: { organisationId, name: 'ABC Group' } });
    entityId = (
      await db.clientEntity.create({
        data: { organisationId, clientId: client.id, name: 'ABC Private Limited' },
      })
    ).id;
    otherEntityId = (
      await db.clientEntity.create({
        data: { organisationId, clientId: client.id, name: 'ABC LLP' },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('creates a contact', async () => {
    const contact = await createContact(organisationId, {
      entityId,
      name: 'Rahul Sharma',
      designation: 'Director',
      email: 'rahul@example.com',
    });

    expect(contact.name).toBe('Rahul Sharma');
    expect(contact.designation).toBe('Director');
    expect(contact.isPrimary).toBe(false);
  });

  it('rejects a duplicate contact name within the same entity, but allows it under a different entity', async () => {
    await createContact(organisationId, { entityId, name: 'Priya Nair' });

    await expect(
      createContact(organisationId, { entityId, name: 'Priya Nair' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });

    const underOtherEntity = await createContact(organisationId, {
      entityId: otherEntityId,
      name: 'Priya Nair',
    });
    expect(underOtherEntity.name).toBe('Priya Nair');
  });

  it('rejects an unknown entity', async () => {
    await expect(
      createContact(organisationId, {
        entityId: '00000000-0000-0000-0000-000000000000',
        name: 'Orphan Contact',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ENTITY' });
  });

  it('allows only one primary contact per entity - setting a new one clears the old one', async () => {
    const first = await createContact(organisationId, {
      entityId,
      name: 'First Primary',
      isPrimary: true,
    });
    expect(first.isPrimary).toBe(true);

    const second = await createContact(organisationId, {
      entityId,
      name: 'Second Primary',
      isPrimary: true,
    });
    expect(second.isPrimary).toBe(true);

    const contacts = await listContactsForEntity(organisationId, entityId);
    const primaries = contacts.filter((c) => c.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].name).toBe('Second Primary');
  });

  it('lists contacts scoped to their entity, and 400s for an unknown entity', async () => {
    const contacts = await listContactsForEntity(organisationId, otherEntityId);
    expect(contacts.every((c) => c.entityId === otherEntityId)).toBe(true);

    await expect(
      listContactsForEntity(organisationId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ENTITY' });
  });

  it('updates a contact, clears a field with null, and promoting it to primary demotes the old primary', async () => {
    const promoted = await createContact(organisationId, {
      entityId: otherEntityId,
      name: 'To Promote',
    });
    await createContact(organisationId, {
      entityId: otherEntityId,
      name: 'Currently Primary',
      isPrimary: true,
    });

    const updated = await updateContact(organisationId, promoted.id, {
      designation: 'Accountant',
      isPrimary: true,
    });
    expect(updated.designation).toBe('Accountant');
    expect(updated.isPrimary).toBe(true);

    const cleared = await updateContact(organisationId, promoted.id, { designation: null });
    expect(cleared.designation).toBeNull();

    const contacts = await listContactsForEntity(organisationId, otherEntityId);
    const primaries = contacts.filter((c) => c.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].id).toBe(promoted.id);
  });

  it('throws 404 updating a contact that does not exist', async () => {
    await expect(
      updateContact(organisationId, '00000000-0000-0000-0000-000000000000', { name: 'Nobody' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('deletes a contact, and 404s deleting one that does not exist', async () => {
    const contact = await createContact(organisationId, { entityId, name: 'Removable Contact' });

    await deleteContact(organisationId, contact.id);

    await expect(deleteContact(organisationId, contact.id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
