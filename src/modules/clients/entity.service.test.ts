import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { createEntity, getEntity, listEntitiesForClient, updateEntity } from './entity.service';

describe('entity service', () => {
  let organisationId: string;
  let clientId: string;
  let otherClientId: string;
  let employeeId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Entity Service Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    clientId = (await db.client.create({ data: { organisationId, name: 'ABC Group' } })).id;
    otherClientId = (await db.client.create({ data: { organisationId, name: 'XYZ Group' } })).id;

    employeeId = (
      await db.user.create({
        data: {
          organisationId,
          email: `manager-${crypto.randomUUID()}@example.com`,
          name: 'Account Manager Person',
          passwordHash: await hashPassword('irrelevant'),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('creates an entity with valid PAN/GSTIN/CIN, normalised to uppercase', async () => {
    const entity = await createEntity(organisationId, {
      clientId,
      name: 'ABC Private Limited',
      pan: 'abcde1234f',
      gstin: '09abcde1234f1z5',
      cin: 'u12345ab1234abc123456',
      accountManagerId: employeeId,
    });

    expect(entity.name).toBe('ABC Private Limited');
    expect(entity.pan).toBe('ABCDE1234F');
    expect(entity.gstin).toBe('09ABCDE1234F1Z5');
    expect(entity.cin).toBe('U12345AB1234ABC123456');
    expect(entity.accountManager?.id).toBe(employeeId);
  });

  it('rejects a malformed PAN, GSTIN, or CIN', async () => {
    await expect(
      createEntity(organisationId, { clientId, name: 'Bad PAN Co', pan: 'not-a-pan' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PAN' });

    await expect(
      createEntity(organisationId, { clientId, name: 'Bad GSTIN Co', gstin: 'not-a-gstin' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_GSTIN' });

    await expect(
      createEntity(organisationId, { clientId, name: 'Bad CIN Co', cin: 'not-a-cin' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CIN' });
  });

  it('rejects a duplicate entity name within the same client, but allows it under a different client', async () => {
    await createEntity(organisationId, { clientId, name: 'ABC LLP' });

    await expect(createEntity(organisationId, { clientId, name: 'ABC LLP' })).rejects.toMatchObject(
      { statusCode: 409, code: 'CONFLICT' },
    );

    const underOtherClient = await createEntity(organisationId, {
      clientId: otherClientId,
      name: 'ABC LLP',
    });
    expect(underOtherClient.name).toBe('ABC LLP');
  });

  it('rejects a duplicate PAN or GSTIN across different entities in the org', async () => {
    const first = await createEntity(organisationId, {
      clientId,
      name: 'Unique PAN Co',
      pan: 'ZZZZZ9999Z',
    });
    expect(first.pan).toBe('ZZZZZ9999Z');

    await expect(
      createEntity(organisationId, {
        clientId: otherClientId,
        name: 'Dup PAN Co',
        pan: 'ZZZZZ9999Z',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('rejects an unknown client or account manager', async () => {
    await expect(
      createEntity(organisationId, {
        clientId: '00000000-0000-0000-0000-000000000000',
        name: 'Orphan Entity',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CLIENT' });

    await expect(
      createEntity(organisationId, {
        clientId,
        name: 'Bad Manager Entity',
        accountManagerId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ACCOUNT_MANAGER' });
  });

  it('lists entities scoped to their client, and 400s for an unknown client', async () => {
    const entities = await listEntitiesForClient(organisationId, otherClientId);
    expect(entities.every((e) => e.clientId === otherClientId)).toBe(true);

    await expect(
      listEntitiesForClient(organisationId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CLIENT' });
  });

  it('gets a single entity and 404s for one that does not exist', async () => {
    const entity = await createEntity(organisationId, { clientId, name: 'Findable Entity' });

    const found = await getEntity(organisationId, entity.id);
    expect(found.name).toBe('Findable Entity');

    await expect(
      getEntity(organisationId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('updates an entity, clears a field with null, and rejects renaming to a name already used under the same client', async () => {
    const entity = await createEntity(organisationId, { clientId, name: 'Updatable Entity' });

    const updated = await updateEntity(organisationId, entity.id, {
      pan: 'AAAAA1111A',
      isActive: false,
    });
    expect(updated.pan).toBe('AAAAA1111A');
    expect(updated.isActive).toBe(false);

    const cleared = await updateEntity(organisationId, entity.id, { pan: null });
    expect(cleared.pan).toBeNull();

    await expect(
      updateEntity(organisationId, entity.id, { name: 'ABC LLP' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 404 updating an entity that does not exist', async () => {
    await expect(
      updateEntity(organisationId, '00000000-0000-0000-0000-000000000000', { isActive: false }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
