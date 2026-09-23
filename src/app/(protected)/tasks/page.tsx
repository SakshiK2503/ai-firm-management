import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { listTasks } from '@/modules/tasks/task.service';
import { listClients } from '@/modules/clients/client.service';
import { listEmployees } from '@/modules/identity/employee.service';
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
  const canViewEmployees = user.roleId
    ? await roleHasPermission(user.roleId, 'employee:view')
    : false;

  const [tasks, clientResult, employees] = await Promise.all([
    listTasks(user.organisationId, {
      scope: canViewAll ? 'all' : 'assigned',
      actorUserId: user.id,
    }),
    canViewAll && canViewClients
      ? listClients(user.organisationId, { scope: 'all', includeInactive: false, pageSize: 100 })
      : Promise.resolve(null),
    canViewAll && canViewEmployees ? listEmployees(user.organisationId) : Promise.resolve([]),
  ]);

  return (
    <TasksAdmin
      initialTasks={tasks}
      clients={clientResult?.clients ?? []}
      employees={employees}
      canCreate={canCreate}
      canFilter={canViewAll}
    />
  );
}
