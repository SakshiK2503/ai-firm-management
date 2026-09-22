import { notFound } from 'next/navigation';
import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getService } from '@/modules/services/service.service';
import { getChecklistForService } from '@/modules/services/checklist.service';
import { getRecurringConfig } from '@/modules/services/recurring.service';
import { listDepartments } from '@/modules/identity/department.service';
import { ServiceDetail } from './ServiceDetail';
import { ServiceChecklist } from './ServiceChecklist';
import { ServiceRecurringConfig } from './ServiceRecurringConfig';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await requireUserWithPermission('service:view');
  if (!allowed) {
    return (
      <div>
        <h1>Service</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const { id } = await params;
  const service = await getService(user.organisationId, id).catch(() => null);
  if (!service) {
    notFound();
  }

  const canManage = user.roleId ? await roleHasPermission(user.roleId, 'service:manage') : false;

  const [checklist, departments, recurringConfig] = await Promise.all([
    getChecklistForService(user.organisationId, id),
    canManage ? listDepartments(user.organisationId) : Promise.resolve([]),
    service.isRecurring ? getRecurringConfig(user.organisationId, id) : Promise.resolve(null),
  ]);

  return (
    <>
      <ServiceDetail
        service={{
          ...service,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
        }}
        departments={departments}
        canManage={canManage}
      />
      <ServiceChecklist serviceId={id} initialChecklist={checklist} canManage={canManage} />
      {service.isRecurring && (
        <ServiceRecurringConfig
          serviceId={id}
          initialConfig={
            recurringConfig
              ? { ...recurringConfig, nextOccurrence: recurringConfig.nextOccurrence.toISOString() }
              : null
          }
          canManage={canManage}
        />
      )}
    </>
  );
}
