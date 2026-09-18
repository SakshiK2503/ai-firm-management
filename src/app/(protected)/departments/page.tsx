import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { listDepartments } from '@/modules/identity/department.service';
import { DepartmentsAdmin } from './DepartmentsAdmin';

export default async function DepartmentsPage() {
  const { user, allowed } = await requireUserWithPermission('department:view');
  if (!allowed) {
    return (
      <div>
        <h1>Departments</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const departments = await listDepartments(user.organisationId, { includeInactive: true });
  return <DepartmentsAdmin initialDepartments={departments} />;
}
