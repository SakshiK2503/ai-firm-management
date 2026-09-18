import { describe, expect, it } from 'vitest';
import { SYSTEM_ROLES } from '@/modules/kernel/rbac/permissions';
import { ROLE_PERMISSION_GRANTS } from './rbac-seed-data';

describe('RBAC role grants', () => {
  it('has a grant list for every system role', () => {
    for (const role of SYSTEM_ROLES) {
      expect(ROLE_PERMISSION_GRANTS[role].length).toBeGreaterThan(0);
    }
  });

  it('is hierarchical: manager gets every preparer permission, partner gets every manager permission', () => {
    const preparer = new Set(ROLE_PERMISSION_GRANTS.preparer);
    const manager = new Set(ROLE_PERMISSION_GRANTS.manager);
    const partner = new Set(ROLE_PERMISSION_GRANTS.partner);

    for (const permission of preparer) expect(manager.has(permission)).toBe(true);
    for (const permission of manager) expect(partner.has(permission)).toBe(true);
  });

  it('only partner can manage the organisation or edit structural client data', () => {
    expect(ROLE_PERMISSION_GRANTS.partner).toContain('organisation:manage');
    expect(ROLE_PERMISSION_GRANTS.partner).toContain('client:editStructural');
    for (const role of ['preparer', 'manager'] as const) {
      expect(ROLE_PERMISSION_GRANTS[role]).not.toContain('organisation:manage');
      expect(ROLE_PERMISSION_GRANTS[role]).not.toContain('client:editStructural');
    }
  });

  it('preparer can only view their own assigned clients, not edit or view all', () => {
    expect(ROLE_PERMISSION_GRANTS.preparer).toContain('client:view');
    expect(ROLE_PERMISSION_GRANTS.preparer).not.toContain('client:viewAll');
    expect(ROLE_PERMISSION_GRANTS.preparer).not.toContain('client:editContact');
  });

  it('preparer cannot reassign or cancel tasks, or view the audit log', () => {
    expect(ROLE_PERMISSION_GRANTS.preparer).not.toContain('task:reassign');
    expect(ROLE_PERMISSION_GRANTS.preparer).not.toContain('task:cancel');
    expect(ROLE_PERMISSION_GRANTS.preparer).not.toContain('auditLog:view');
  });
});
