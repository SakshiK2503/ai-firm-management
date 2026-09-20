import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';

// Indian tax/compliance identifiers, per PRD S6's entity field table. Format-checked (when
// provided - all three are optional, a firm may onboard a client before having these in hand)
// because a malformed PAN/GSTIN/CIN is a real data-quality bug for an accounting firm, not a
// cosmetic one.
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CIN_PATTERN = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

export function validatePan(pan: string): string {
  const normalised = pan.trim().toUpperCase();
  if (!PAN_PATTERN.test(normalised)) {
    throw new ApiError(400, 'INVALID_PAN', 'Enter a valid PAN (e.g. ABCDE1234F).');
  }
  return normalised;
}

export function validateGstin(gstin: string): string {
  const normalised = gstin.trim().toUpperCase();
  if (!GSTIN_PATTERN.test(normalised)) {
    throw new ApiError(400, 'INVALID_GSTIN', 'Enter a valid GSTIN (e.g. 09ABCDE1234F1Z5).');
  }
  return normalised;
}

export function validateCin(cin: string): string {
  const normalised = cin.trim().toUpperCase();
  if (!CIN_PATTERN.test(normalised)) {
    throw new ApiError(400, 'INVALID_CIN', 'Enter a valid CIN (e.g. U12345AB1234ABC123456).');
  }
  return normalised;
}

async function assertClientExists(organisationId: string, clientId: string) {
  const client = await db.client.findFirst({ where: { id: clientId, organisationId } });
  if (!client) {
    throw new ApiError(400, 'INVALID_CLIENT', 'Client not found.');
  }
}

async function assertAccountManagerExists(organisationId: string, userId: string) {
  const employee = await db.user.findFirst({ where: { id: userId, organisationId } });
  if (!employee) {
    throw new ApiError(400, 'INVALID_ACCOUNT_MANAGER', 'Account manager not found.');
  }
}

function toDuplicateFieldError(error: unknown): ApiError | null {
  if (!isUniqueConstraintError(error)) return null;
  const target = (error as { meta?: { target?: string[] } }).meta?.target ?? [];
  if (target.includes('pan')) {
    return new ApiError(409, 'CONFLICT', 'Another entity already uses this PAN.');
  }
  if (target.includes('gstin')) {
    return new ApiError(409, 'CONFLICT', 'Another entity already uses this GSTIN.');
  }
  return new ApiError(409, 'CONFLICT', 'An entity with this name already exists for this client.');
}

const ENTITY_SELECT = {
  id: true,
  clientId: true,
  name: true,
  pan: true,
  gstin: true,
  cin: true,
  phone: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  accountManager: { select: { id: true, name: true } },
};

export interface EntityInput {
  clientId: string;
  name: string;
  pan?: string;
  gstin?: string;
  cin?: string;
  accountManagerId?: string;
  phone?: string;
  email?: string;
}

function normalisedIdentifiers<
  T extends { pan?: string | null; gstin?: string | null; cin?: string | null },
>(input: T) {
  return {
    pan: input.pan ? validatePan(input.pan) : input.pan,
    gstin: input.gstin ? validateGstin(input.gstin) : input.gstin,
    cin: input.cin ? validateCin(input.cin) : input.cin,
  };
}

export async function createEntity(organisationId: string, input: EntityInput) {
  await assertClientExists(organisationId, input.clientId);
  if (input.accountManagerId) {
    await assertAccountManagerExists(organisationId, input.accountManagerId);
  }
  const identifiers = await normalisedIdentifiers(input);

  try {
    return await db.clientEntity.create({
      data: { organisationId, ...input, ...identifiers },
      select: ENTITY_SELECT,
    });
  } catch (error) {
    const duplicateError = toDuplicateFieldError(error);
    if (duplicateError) throw duplicateError;
    throw error;
  }
}

export async function listEntitiesForClient(organisationId: string, clientId: string) {
  await assertClientExists(organisationId, clientId);

  return db.clientEntity.findMany({
    where: { organisationId, clientId },
    select: ENTITY_SELECT,
    orderBy: { name: 'asc' },
  });
}

export async function getEntity(organisationId: string, entityId: string) {
  const entity = await db.clientEntity.findFirst({
    where: { id: entityId, organisationId },
    select: ENTITY_SELECT,
  });
  if (!entity) {
    throw new ApiError(404, 'NOT_FOUND', 'Entity not found.');
  }
  return entity;
}

export interface EntityUpdateInput {
  name?: string;
  pan?: string | null;
  gstin?: string | null;
  cin?: string | null;
  accountManagerId?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
}

export async function updateEntity(
  organisationId: string,
  entityId: string,
  input: EntityUpdateInput,
) {
  const existing = await db.clientEntity.findFirst({ where: { id: entityId, organisationId } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Entity not found.');
  }

  if (input.accountManagerId) {
    await assertAccountManagerExists(organisationId, input.accountManagerId);
  }
  const identifiers = await normalisedIdentifiers(input);

  try {
    return await db.clientEntity.update({
      where: { id: entityId },
      data: { ...input, ...identifiers },
      select: ENTITY_SELECT,
    });
  } catch (error) {
    const duplicateError = toDuplicateFieldError(error);
    if (duplicateError) throw duplicateError;
    throw error;
  }
}
