import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { requireUser } from '@/modules/kernel/auth/require-user';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  // A hidden nav link is a UX nicety, not the real enforcement - the /departments page and its
  // API routes check this same permission again independently either way.
  const canViewDepartments = user.roleId
    ? await roleHasPermission(user.roleId, 'department:view')
    : false;

  return (
    <AppShell userName={user.name} canViewDepartments={canViewDepartments}>
      {children}
    </AppShell>
  );
}
