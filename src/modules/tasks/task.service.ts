import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { assertEntityBelongsToClient } from '@/modules/clients/entity.service';
import { assertEngagementActive } from '@/modules/services/engagement.service';
import { assertServiceAssignable } from '@/modules/services/service.service';
import type { TaskPriority, TaskStatus } from '@/generated/prisma/client';

const TASK_SELECT = {
  id: true,
  taskNumber: true,
  clientId: true,
  clientEntityId: true,
  departmentId: true,
  serviceId: true,
  title: true,
  priority: true,
  source: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  assignedToId: true,
  client: { select: { id: true, name: true } },
  clientEntity: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  service: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
};

export interface TaskInput {
  clientId: string;
  clientEntityId: string;
  serviceId: string;
  title: string;
  priority?: TaskPriority;
}

// Atomically claims the next number for this org+month via Postgres's row-level locking on the
// UPDATE (two concurrent callers both incrementing the same row serialize, neither loses an
// update) - safe without an explicit SELECT ... FOR UPDATE.
async function generateTaskNumber(organisationId: string): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const sequence = await db.taskSequence.upsert({
    where: { organisationId_yearMonth: { organisationId, yearMonth } },
    update: { lastNumber: { increment: 1 } },
    create: { organisationId, yearMonth, lastNumber: 1 },
  });

  return `TASK-${yearMonth}-${String(sequence.lastNumber).padStart(6, '0')}`;
}

export async function createTask(organisationId: string, input: TaskInput) {
  await assertEntityBelongsToClient(organisationId, input.clientId, input.clientEntityId);
  await assertEngagementActive(organisationId, input.clientEntityId, input.serviceId);
  // An engagement can stay isActive even after its service is later disabled (no automatic
  // cascades - see the Department/Service precedent), so this is a separate check, not redundant
  // with assertEngagementActive above.
  await assertServiceAssignable(organisationId, input.serviceId);

  const service = await db.service.findFirst({
    where: { id: input.serviceId, organisationId },
    select: { departmentId: true },
  });
  if (!service) {
    throw new ApiError(400, 'INVALID_SERVICE', 'Service not found.');
  }

  const taskNumber = await generateTaskNumber(organisationId);

  return db.task.create({
    data: {
      organisationId,
      taskNumber,
      clientId: input.clientId,
      clientEntityId: input.clientEntityId,
      departmentId: service.departmentId,
      serviceId: input.serviceId,
      title: input.title,
      priority: input.priority ?? 'NORMAL',
    },
    select: TASK_SELECT,
  });
}

export interface TaskListFilters {
  // 'assigned' is a Preparer without task:viewAll - resolved to "tasks where assignedToId is
  // this caller" now that Assignment (Day 49) exists. actorUserId is required in that case;
  // see docs/RBAC.md, this closes the "no assignment mechanism yet" gap noted since Day 44.
  scope: 'all' | 'assigned';
  actorUserId?: string;
  status?: TaskStatus;
  clientId?: string;
  priority?: TaskPriority;
  assignedToId?: string;
  // Day 46's acceptance check also lists a date filter - needs dueDate, its own later day
  // ("Dates"). Added here once that lands, not guessed at now.
}

export async function listTasks(organisationId: string, options: TaskListFilters) {
  return db.task.findMany({
    where: {
      organisationId,
      ...(options.scope === 'assigned' ? { assignedToId: options.actorUserId } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.clientId ? { clientId: options.clientId } : {}),
      ...(options.priority ? { priority: options.priority } : {}),
      ...(options.assignedToId ? { assignedToId: options.assignedToId } : {}),
    },
    select: TASK_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTask(organisationId: string, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, organisationId },
    select: TASK_SELECT,
  });
  if (!task) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  }
  return task;
}
