import { notFound } from 'next/navigation';
import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getEntity } from '@/modules/clients/entity.service';
import { listEmployees } from '@/modules/identity/employee.service';
import { EntityDetail } from './EntityDetail';

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string; entityId: string }>;
}) {
  const { user, allowed } = await requireUserWithPermission('client:view');
  if (!allowed) {
    return (
      <div>
        <h1>Entity</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'client:viewAll') : false;
  if (!canViewAll) {
    // Mirrors the client detail page's scoping - no Task/assignment table yet (see docs/RBAC.md's
    // known gaps), so a Preparer has no entity access for now.
    notFound();
  }

  const { id, entityId } = await params;
  const entity = await getEntity(user.organisationId, entityId).catch(() => null);
  if (!entity || entity.clientId !== id) {
    notFound();
  }

  const canManage = user.roleId
    ? await roleHasPermission(user.roleId, 'client:editStructural')
    : false;
  const employees = canManage ? await listEmployees(user.organisationId) : [];

  return <EntityDetail clientId={id} entity={entity} employees={employees} canManage={canManage} />;
}
