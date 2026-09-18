import type { NextRequest } from 'next/server';
import { ApiError } from '@/modules/kernel/errors';
import { getCurrentUser } from '@/modules/kernel/auth/session';
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
