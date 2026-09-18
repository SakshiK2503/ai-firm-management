import type { Permission, SystemRole } from '@/modules/kernel/rbac/permissions';

/**
 * The actual role -> permission grants, seeded into RolePermission (see seed-data.ts). This is
 * the one hardcoded mapping in the system, reviewed against product roles per Day 14's own
 * acceptance check - see docs/RBAC.md for the reasoning. Changing what a role can do from here
 * on is a data change: edit this list and re-seed, or update the RolePermission rows directly.
 * Adding a wholly new role needs a new Role row plus a grant list like these - no application
 * code (routes, middleware, UI) has to change, because enforcement always queries
 * RolePermission and never branches on a role name.
 */

export const SYSTEM_ROLE_DISPLAY_NAMES: Record<SystemRole, string> = {
  preparer: 'Preparer',
  manager: 'Manager',
  partner: 'Partner',
};

const PREPARER_PERMISSIONS: readonly Permission[] = [
  'task:view',
  'task:updateStatus',
  'document:view',
  'document:upload',
  'timeEntry:viewOwn',
  'timeEntry:log',
  'deadline:view',
  'client:view',
  'dashboard:view',
];

const MANAGER_PERMISSIONS: readonly Permission[] = [
  ...PREPARER_PERMISSIONS,
  'task:viewAll',
  'task:create',
  'task:reassign',
  'task:review',
  'task:cancel',
  'document:delete',
  'timeEntry:viewAll',
  'timeEntry:approve',
  'deadline:manage',
  'client:viewAll',
  'client:editContact',
  'service:view',
  'employee:view',
  'allocation:override',
];

const PARTNER_PERMISSIONS: readonly Permission[] = [
  ...MANAGER_PERMISSIONS,
  'organisation:manage',
  'department:view',
  'department:manage',
  'employee:manage',
  'service:manage',
  'client:editStructural',
  'auditLog:view',
];

export const ROLE_PERMISSION_GRANTS: Readonly<Record<SystemRole, readonly Permission[]>> = {
  preparer: PREPARER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  partner: PARTNER_PERMISSIONS,
};
