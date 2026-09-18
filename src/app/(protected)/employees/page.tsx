import { db } from '@/modules/kernel/db';
import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { listEmployees } from '@/modules/identity/employee.service';
import { EmployeesAdmin } from './EmployeesAdmin';

export default async function EmployeesPage() {
  const { user, allowed } = await requireUserWithPermission('employee:view');
  if (!allowed) {
    return (
      <div>
        <h1>Employees</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const canManage = user.roleId ? await roleHasPermission(user.roleId, 'employee:manage') : false;
  const employees = await listEmployees(user.organisationId, { includeInactive: true });

  const [departments, roles, potentialManagers] = canManage
    ? await Promise.all([
        db.department.findMany({
          where: { organisationId: user.organisationId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.role.findMany({
          where: { organisationId: user.organisationId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.user.findMany({
          where: { organisationId: user.organisationId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ])
    : [[], [], []];

  return (
    <EmployeesAdmin
      initialEmployees={employees}
      canManage={canManage}
      departments={departments}
      roles={roles}
      potentialManagers={potentialManagers}
    />
  );
}
