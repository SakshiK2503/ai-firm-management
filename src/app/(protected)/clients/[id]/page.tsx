import { notFound } from 'next/navigation';
import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getClient } from '@/modules/clients/client.service';
import { ClientDetail } from './ClientDetail';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await requireUserWithPermission('client:view');
  if (!allowed) {
    return (
      <div>
        <h1>Client</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'client:viewAll') : false;
  if (!canViewAll) {
    // Mirrors the list's scoping - no Task/assignment table yet to determine "assigned to me
    // (see docs/RBAC.md's known gaps), so a Preparer has no client detail access for now.
    notFound();
  }

  const { id } = await params;
  const client = await getClient(user.organisationId, id).catch(() => null);
  if (!client) {
    notFound();
  }

  const canManage = user.roleId
    ? await roleHasPermission(user.roleId, 'client:editStructural')
    : false;

  return (
    <ClientDetail
      client={{ ...client, createdAt: client.createdAt.toISOString() }}
      canManage={canManage}
    />
  );
}
