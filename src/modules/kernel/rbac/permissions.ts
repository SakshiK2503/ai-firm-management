import { db } from '@/modules/kernel/db';

/**
 * The permission catalog and the three system roles. See docs/RBAC.md for the design
 * rationale. This file is the source of truth for *what permission keys exist* (a fixed,
 * code-defined vocabulary - a new permission key needs new enforcement code to check it,
 * so it can't be invented purely as data). *Which permissions a role has* is deliberately
 * NOT here - it's data (the RolePermission table), seeded by prisma/seed-data.ts, so that
 * adding a role or adjusting its grants is a data change, never an enforcement-code change.
 * Never branch on a role name (`if (role === 'manager')`) - always check a permission key.
 */

export const SYSTEM_ROLES = ['preparer', 'manager', 'partner'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const PERMISSION_CATALOG = [
  { key: 'organisation:manage', description: 'Manage organisation-wide settings' },
  { key: 'department:view', description: 'View departments' },
  { key: 'department:manage', description: 'Create, edit, and disable departments' },
  { key: 'employee:view', description: 'View employee directory' },
  { key: 'employee:manage', description: 'Create, edit, and deactivate employees' },
  { key: 'skill:view', description: 'View the skill catalogue and employee skill assignments' },
  {
    key: 'skill:manage',
    description: 'Create, edit, and disable skills; assign or remove an employee’s skills',
  },
  { key: 'availability:view', description: 'View employee availability and leave records' },
  {
    key: 'availability:manage',
    description: 'Create, edit, and delete employee availability and leave records',
  },
  { key: 'client:view', description: 'View clients assigned to you' },
  { key: 'client:viewAll', description: 'View all clients firm-wide' },
  {
    key: 'client:editContact',
    description: 'Edit lightweight client fields: contact notes, service assignment',
  },
  {
    key: 'client:editStructural',
    description:
      'Edit structural client fields: billing structure, PAN/GSTIN, terminate an engagement',
  },
  { key: 'service:view', description: 'View the service catalogue' },
  { key: 'service:manage', description: 'Create and edit services' },
  { key: 'task:view', description: 'View tasks assigned to you' },
  { key: 'task:viewAll', description: 'View all tasks firm-wide' },
  { key: 'task:create', description: 'Create a task' },
  { key: 'task:updateStatus', description: 'Update the status of a task assigned to you' },
  { key: 'task:reassign', description: 'Reassign a task to a different employee' },
  { key: 'task:review', description: 'Review and approve/reject a task' },
  {
    key: 'task:cancel',
    description: 'Cancel a task (soft, auditable - there is no task:delete; nothing disappears)',
  },
  { key: 'document:view', description: 'View documents' },
  { key: 'document:upload', description: 'Upload a document' },
  { key: 'document:delete', description: 'Delete a document' },
  { key: 'timeEntry:viewOwn', description: 'View your own logged time' },
  { key: 'timeEntry:viewAll', description: 'View everyone’s logged time' },
  { key: 'timeEntry:log', description: 'Log time against a task' },
  { key: 'timeEntry:approve', description: 'Approve logged time' },
  { key: 'deadline:view', description: 'View deadlines' },
  { key: 'deadline:manage', description: 'Create and edit deadlines' },
  { key: 'allocation:override', description: 'Override an AI-proposed task allocation' },
  {
    key: 'auditLog:view',
    description: 'View the audit log (read-only - there is no auditLog:manage for anyone)',
  },
  { key: 'dashboard:view', description: 'View exception dashboards' },
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number]['key'];

export function isPermission(value: string): value is Permission {
  return PERMISSION_CATALOG.some((entry) => entry.key === value);
}

/** Queries the DB-backed grant, never a hardcoded role check - this is the whole point of
 * modeling roles as data. Used by Day 15's enforcement middleware. */
export async function roleHasPermission(roleId: string, permission: Permission): Promise<boolean> {
  const count = await db.rolePermission.count({
    where: { roleId, permissionKey: permission },
  });
  return count > 0;
}
