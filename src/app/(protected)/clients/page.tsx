import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { listClients } from '@/modules/clients/client.service';
import { ClientsAdmin } from './ClientsAdmin';

export default async function ClientsPage() {
  const { user, allowed } = await requireUserWithPermission('client:view');
  if (!allowed) {
    return (
      <div>
        <h1>Clients</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'client:viewAll') : false;
  const canManage = user.roleId
    ? await roleHasPermission(user.roleId, 'client:editStructural')
    : false;

  const result = await listClients(user.organisationId, { scope: canViewAll ? 'all' : 'assigned' });

  return <ClientsAdmin initialResult={result} canManage={canManage} canViewAny={canViewAll} />;
}
