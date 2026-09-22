import { notFound } from 'next/navigation';
import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getEntity } from '@/modules/clients/entity.service';
import { listContactsForEntity } from '@/modules/clients/contact.service';
import { listEmployees } from '@/modules/identity/employee.service';
import { listEngagementsForEntity } from '@/modules/services/engagement.service';
import { listServiceTree } from '@/modules/services/service.service';
import { EntityDetail } from './EntityDetail';
import { EntityContacts } from './EntityContacts';
import { EntityEngagements } from './EntityEngagements';

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
  const canManageContacts = user.roleId
    ? await roleHasPermission(user.roleId, 'client:editContact')
    : false;
  const [employees, contacts, engagements, serviceTree] = await Promise.all([
    canManage ? listEmployees(user.organisationId) : Promise.resolve([]),
    listContactsForEntity(user.organisationId, entityId),
    listEngagementsForEntity(user.organisationId, id, entityId),
    canManage ? listServiceTree(user.organisationId) : Promise.resolve([]),
  ]);
  const primaryContact = contacts.find((contact) => contact.isPrimary) ?? null;

  return (
    <>
      <EntityDetail
        clientId={id}
        entity={entity}
        employees={employees}
        canManage={canManage}
        primaryContactName={primaryContact?.name ?? null}
      />
      <EntityContacts
        clientId={id}
        entityId={entityId}
        initialContacts={contacts}
        canManage={canManageContacts}
      />
      <EntityEngagements
        clientId={id}
        entityId={entityId}
        initialEngagements={engagements.map((engagement) => ({
          ...engagement,
          engagementStart: engagement.engagementStart.toISOString(),
        }))}
        serviceTree={serviceTree}
        canManage={canManage}
      />
    </>
  );
}
