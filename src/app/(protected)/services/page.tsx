import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { listServiceTree } from '@/modules/services/service.service';
import { listDepartments } from '@/modules/identity/department.service';
import { ServicesAdmin } from './ServicesAdmin';

export default async function ServicesPage() {
  const { user, allowed } = await requireUserWithPermission('service:view');
  if (!allowed) {
    return (
      <div>
        <h1>Services</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const canManage = user.roleId ? await roleHasPermission(user.roleId, 'service:manage') : false;

  const [tree, departments] = await Promise.all([
    listServiceTree(user.organisationId, { includeInactive: true }),
    canManage ? listDepartments(user.organisationId) : Promise.resolve([]),
  ]);

  return <ServicesAdmin initialTree={tree} departments={departments} canManage={canManage} />;
}
