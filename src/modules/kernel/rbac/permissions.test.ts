import { describe, expect, it } from 'vitest';
import {
  hasPermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  type SystemRole,
} from './permissions';

describe('RBAC permission matrix', () => {
  it('has no duplicate permission strings', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it('has a matrix entry for every system role', () => {
    for (const role of SYSTEM_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(ROLE_PERMISSIONS[role].size).toBeGreaterThan(0);
    }
  });

  it('is hierarchical: manager has every preparer permission, partner has every manager permission', () => {
    for (const permission of ROLE_PERMISSIONS.preparer) {
      expect(ROLE_PERMISSIONS.manager.has(permission)).toBe(true);
    }
    for (const permission of ROLE_PERMISSIONS.manager) {
      expect(ROLE_PERMISSIONS.partner.has(permission)).toBe(true);
    }
  });

  it('gives partner strictly more permissions than manager, and manager strictly more than preparer', () => {
    expect(ROLE_PERMISSIONS.manager.size).toBeGreaterThan(ROLE_PERMISSIONS.preparer.size);
    expect(ROLE_PERMISSIONS.partner.size).toBeGreaterThan(ROLE_PERMISSIONS.manager.size);
  });

  it('only partner can manage the organisation', () => {
    const rolesWithAccess = SYSTEM_ROLES.filter((role: SystemRole) =>
      hasPermission(role, 'organisation:manage'),
    );
    expect(rolesWithAccess).toEqual(['partner']);
  });

  it('preparer cannot delete tasks or view the audit log', () => {
    expect(hasPermission('preparer', 'task:delete')).toBe(false);
    expect(hasPermission('preparer', 'auditLog:view')).toBe(false);
  });

  it('every role can view their own tasks and the dashboard', () => {
    for (const role of SYSTEM_ROLES) {
      expect(hasPermission(role, 'task:view')).toBe(true);
      expect(hasPermission(role, 'dashboard:view')).toBe(true);
    }
  });
});
