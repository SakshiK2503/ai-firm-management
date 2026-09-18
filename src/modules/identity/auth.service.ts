import type { User } from '@/generated/prisma/client';
import { db } from '@/modules/kernel/db';
import { verifyPassword } from '@/modules/kernel/auth/password';
import { createSession } from '@/modules/kernel/auth/session';
import { ApiError } from '@/modules/kernel/errors';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

export function toSafeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organisationId: user.organisationId,
  };
}

/**
 * Looks up a user by email across all organisations - there's only ever one organisation
 * today, so this is a known simplification, not a real multi-tenant login flow. Revisit if
 * multi-tenant onboarding is ever built (explicitly out of scope for now per CLAUDE.md).
 */
export async function login(email: string, password: string) {
  const user = await db.user.findFirst({ where: { email } });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
  }

  const session = await createSession(user.id, user.organisationId);

  return { user: toSafeUser(user), session };
}
