import type { NextRequest } from 'next/server';
import { ApiError } from '@/modules/kernel/errors';
import { getCurrentUser } from '@/modules/kernel/auth/session';
import { requireUser } from '@/modules/kernel/auth/require-user';
import { roleHasPermission, type Permission } from './permissions';

/**
 * The one place a route handler should check access. Throws ApiError(401) if there's no valid
 * session, ApiError(403) if the session is valid but the user's role lacks the permission.
 * Never checks a role name directly - see docs/RBAC.md.
 */
export async function requirePermission(request: NextRequest, permission: Permission) {
  const current = await getCurrentUser(request);
  if (!current) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Not logged in.');
  }

  const { user } = current;
  const allowed = user.roleId ? await roleHasPermission(user.roleId, permission) : false;
  if (!allowed) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to do this.');
  }

  return current;
}

/**
 * For Server Component pages: redirects to /login (via requireUser) if not authenticated, then
 * returns whether the current user's role has the permission. The page decides what "no" means
 * (an inline message, a redirect elsewhere) - unlike requirePermission(), which always throws
 * for a Route Handler since there's only ever one sensible response there.
 */
export async function requireUserWithPermission(permission: Permission) {
  const user = await requireUser();
  const allowed = user.roleId ? await roleHasPermission(user.roleId, permission) : false;
  return { user, allowed };
}
