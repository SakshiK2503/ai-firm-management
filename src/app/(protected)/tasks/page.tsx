import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { listTasks } from '@/modules/tasks/task.service';
import { listClients } from '@/modules/clients/client.service';
import { TasksAdmin } from './TasksAdmin';

export default async function TasksPage() {
  const { user, allowed } = await requireUserWithPermission('task:view');
  if (!allowed) {
    return (
      <div>
        <h1>Tasks</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'task:viewAll') : false;
  const canCreate = user.roleId ? await roleHasPermission(user.roleId, 'task:create') : false;
  const canViewClients = user.roleId
    ? await roleHasPermission(user.roleId, 'client:viewAll')
    : false;

  const [tasks, clientResult] = await Promise.all([
    listTasks(user.organisationId, { scope: canViewAll ? 'all' : 'assigned' }),
    canCreate && canViewClients
      ? listClients(user.organisationId, { scope: 'all', includeInactive: false, pageSize: 100 })
      : Promise.resolve(null),
  ]);

  return (
    <TasksAdmin initialTasks={tasks} clients={clientResult?.clients ?? []} canCreate={canCreate} />
  );
}
