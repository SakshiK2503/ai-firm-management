import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { requireUser } from '@/modules/kernel/auth/require-user';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  // Hidden nav links are a UX nicety, not the real enforcement - each page and its API routes
  // check the same permission again independently either way.
  const canViewDepartments = user.roleId
    ? await roleHasPermission(user.roleId, 'department:view')
    : false;
  const canViewEmployees = user.roleId
    ? await roleHasPermission(user.roleId, 'employee:view')
    : false;

  return (
    <AppShell
      userName={user.name}
      canViewDepartments={canViewDepartments}
      canViewEmployees={canViewEmployees}
    >
      {children}
    </AppShell>
  );
}
