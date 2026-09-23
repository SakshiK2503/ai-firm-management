import { notFound } from 'next/navigation';
import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getTask } from '@/modules/tasks/task.service';
import { getValidNextStatuses } from '@/modules/tasks/workflow.service';
import { getEngagementForEntityService } from '@/modules/services/engagement.service';
import { TaskStatusControl } from './TaskStatusControl';
import { TaskAssignment } from './TaskAssignment';
import styles from './page.module.css';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await requireUserWithPermission('task:view');
  if (!allowed) {
    return (
      <div>
        <h1>Task</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const { id } = await params;
  const task = await getTask(user.organisationId, id).catch(() => null);
  if (!task) {
    notFound();
  }

  const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'task:viewAll') : false;
  // Without task:viewAll, access is limited to a task actually assigned to this caller
  // (task:view's own description: "View tasks assigned to you") - meaningful now that
  // Assignment (Day 49) added assignedToId.
  if (!canViewAll && task.assignedToId !== user.id) {
    notFound();
  }

  const engagement = await getEngagementForEntityService(
    user.organisationId,
    task.clientEntityId,
    task.serviceId,
  );

  const [canUpdateStatus, canReview, canCancel, canReassign] = await Promise.all([
    user.roleId ? roleHasPermission(user.roleId, 'task:updateStatus') : false,
    user.roleId ? roleHasPermission(user.roleId, 'task:review') : false,
    user.roleId ? roleHasPermission(user.roleId, 'task:cancel') : false,
    user.roleId ? roleHasPermission(user.roleId, 'task:reassign') : false,
  ]);

  return (
    <div>
      <h1>{task.title}</h1>
      <p className={styles.taskNumber}>{task.taskNumber}</p>

      <section>
        <h2>Header</h2>
        <dl className={styles.detailList}>
          <dt>Client</dt>
          <dd>
            <a href={`/clients/${task.client.id}`}>{task.client.name}</a>
          </dd>
          <dt>Entity</dt>
          <dd>
            <a href={`/clients/${task.client.id}/entities/${task.clientEntity.id}`}>
              {task.clientEntity.name}
            </a>
          </dd>
          <dt>Department</dt>
          <dd>{task.department?.name ?? '—'}</dd>
          <dt>Service</dt>
          <dd>
            <a href={`/services/${task.service.id}`}>{task.service.name}</a>
          </dd>
          <dt>Priority</dt>
          <dd>{task.priority}</dd>
          <dt>Source</dt>
          <dd>{task.source}</dd>
          <dt>Created</dt>
          <dd>{task.createdAt.toLocaleString()}</dd>
        </dl>
      </section>

      <section className={styles.section}>
        <h2>Workflow</h2>
        <TaskStatusControl
          taskId={task.id}
          initialStatus={task.status}
          validNextStatuses={getValidNextStatuses(task.status)}
          canUpdateStatus={canUpdateStatus}
          canReview={canReview}
          canCancel={canCancel}
        />
      </section>

      <section className={styles.section}>
        <h2>Assignment</h2>
        <TaskAssignment
          taskId={task.id}
          status={task.status}
          assignedTo={task.assignedTo}
          canReassign={canReassign}
        />
      </section>

      <section className={styles.section}>
        <h2>Engagement</h2>
        {engagement ? (
          <dl className={styles.detailList}>
            <dt>Billing structure</dt>
            <dd>{engagement.billingStructure}</dd>
            <dt>Engagement start</dt>
            <dd>{engagement.engagementStart.toLocaleDateString()}</dd>
            <dt>Status</dt>
            <dd>{engagement.isActive ? 'Active' : 'Terminated'}</dd>
          </dl>
        ) : (
          <p>No engagement record found for this entity/service pairing.</p>
        )}
      </section>
    </div>
  );
}
