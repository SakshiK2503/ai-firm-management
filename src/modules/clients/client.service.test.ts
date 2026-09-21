import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { createClient, getClient, listClients, updateClient } from './client.service';

describe('client service', () => {
  let organisationId: string;
  let otherOrganisationId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Client Service Test Org ${crypto.randomUUID()}` },
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

  it('creates a client and rejects a duplicate name in the same organisation', async () => {
    const client = await createClient(organisationId, 'ABC Group');
    expect(client.name).toBe('ABC Group');
    expect(client.isActive).toBe(true);

    await expect(createClient(organisationId, 'ABC Group')).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('allows the same client name in a different organisation', async () => {
    await createClient(organisationId, 'XYZ Group');
    const client = await createClient(otherOrganisationId, 'XYZ Group');
    expect(client.name).toBe('XYZ Group');
  });

  it('returns an empty page with "assigned" scope (no Task table to scope by yet)', async () => {
    const result = await listClients(organisationId, { scope: 'assigned' });
    expect(result).toEqual({ clients: [], total: 0, page: 1, pageSize: 20 });
  });

  it('lists only active clients by default with "all" scope, and can search', async () => {
    const disabled = await createClient(organisationId, 'Legacy Client');
    await updateClient(organisationId, disabled.id, { isActive: false });

    const active = await listClients(organisationId, { scope: 'all' });
    expect(active.clients.some((c) => c.name === 'Legacy Client')).toBe(false);

    const all = await listClients(organisationId, { scope: 'all', includeInactive: true });
    expect(all.clients.some((c) => c.name === 'Legacy Client')).toBe(true);

    const searched = await listClients(organisationId, { scope: 'all', search: 'abc' });
    expect(searched.clients.map((c) => c.name)).toEqual(['ABC Group']);
  });

  it('paginates results', async () => {
    const org = await db.organisation.create({
      data: { name: `Pagination Test Org ${crypto.randomUUID()}` },
    });
    for (let i = 1; i <= 5; i++) {
      await createClient(org.id, `Client ${i}`);
    }

    const firstPage = await listClients(org.id, { scope: 'all', page: 1, pageSize: 2 });
    expect(firstPage.clients).toHaveLength(2);
    expect(firstPage.total).toBe(5);
    expect(firstPage.clients.map((c) => c.name)).toEqual(['Client 1', 'Client 2']);

    const secondPage = await listClients(org.id, { scope: 'all', page: 2, pageSize: 2 });
    expect(secondPage.clients.map((c) => c.name)).toEqual(['Client 3', 'Client 4']);

    const thirdPage = await listClients(org.id, { scope: 'all', page: 3, pageSize: 2 });
    expect(thirdPage.clients.map((c) => c.name)).toEqual(['Client 5']);

    await db.organisation.delete({ where: { id: org.id } });
  });

  it('gets a single client and 404s for one that does not exist', async () => {
    const client = await createClient(organisationId, 'Single Client');

    const found = await getClient(organisationId, client.id);
    expect(found.name).toBe('Single Client');

    await expect(
      getClient(organisationId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('renames a client, toggles active status, and rejects renaming to a name that already exists', async () => {
    const client = await createClient(organisationId, 'Renameable Client');

    const updated = await updateClient(organisationId, client.id, {
      name: 'Renamed Client',
      isActive: false,
    });
    expect(updated.name).toBe('Renamed Client');
    expect(updated.isActive).toBe(false);

    await expect(
      updateClient(organisationId, client.id, { name: 'ABC Group' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 404 when updating a client that belongs to a different organisation', async () => {
    const client = await createClient(otherOrganisationId, 'Other Org Client');

    await expect(
      updateClient(organisationId, client.id, { isActive: false }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('sets and clears client instructions', async () => {
    const client = await createClient(organisationId, 'Instructed Client');
    expect(client.instructions).toBeNull();

    const withInstructions = await updateClient(organisationId, client.id, {
      instructions: 'Always CC the CFO on GST filings.',
    });
    expect(withInstructions.instructions).toBe('Always CC the CFO on GST filings.');

    const cleared = await updateClient(organisationId, client.id, { instructions: null });
    expect(cleared.instructions).toBeNull();
  });
});
