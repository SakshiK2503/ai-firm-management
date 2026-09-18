/**
 * Role-permission matrix. See docs/RBAC.md for the design rationale and the table this
 * mirrors - that doc is the source of truth for *why*, this file is the source of truth for
 * *what the code actually does*. Enforcement (routes/pages calling hasPermission and acting on
 * it) is Day 15, not here.
 */

export const SYSTEM_ROLES = ['preparer', 'manager', 'partner'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const PERMISSIONS = [
  'organisation:manage',
  'department:view',
  'department:manage',
  'employee:view',
  'employee:manage',
  'client:view',
  'client:manage',
  'service:view',
  'service:manage',
  'task:view',
  'task:viewAll',
  'task:create',
  'task:updateStatus',
  'task:reassign',
  'task:review',
  'task:delete',
  'document:view',
  'document:upload',
  'document:delete',
  'timeEntry:viewOwn',
  'timeEntry:viewAll',
  'timeEntry:log',
  'timeEntry:approve',
  'deadline:view',
  'deadline:manage',
  'allocation:override',
  'auditLog:view',
  'dashboard:view',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

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
  'task:delete',
  'document:delete',
  'timeEntry:viewAll',
  'timeEntry:approve',
  'deadline:manage',
  'client:manage',
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
  'auditLog:view',
];

export const ROLE_PERMISSIONS: Readonly<Record<SystemRole, ReadonlySet<Permission>>> = {
  preparer: new Set(PREPARER_PERMISSIONS),
  manager: new Set(MANAGER_PERMISSIONS),
  partner: new Set(PARTNER_PERMISSIONS),
};

export function hasPermission(role: SystemRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
