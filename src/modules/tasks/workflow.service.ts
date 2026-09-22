import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import type { TaskStatus } from '@/generated/prisma/client';
import type { Permission } from '@/modules/kernel/rbac/permissions';

const TERMINAL_STATUSES: TaskStatus[] = ['ARCHIVED', 'CANCELLED'];

// The PRD §12 status flow, exactly as drawn, with two judgment calls the diagram leaves
// unspecified (documented here since they're not literally in the PRD text):
// - CORRECTION_REQUIRED -> IN_PROGRESS: the PRD shows "Correction Required or Approved" as the
//   branch after review, but never draws where "Correction Required" goes next. Rework has to
//   re-enter the work loop somewhere, and IN_PROGRESS (not straight back to Submitted for
//   Review) is the only place that makes sense - the work has to actually be redone first.
// - CANCELLED reachable from any non-terminal status (added below, not in this table): the PRD
//   lists Cancelled as "a separate status" without saying which statuses can reach it. Matches
//   task:cancel's own permission description ("Cancel a task") with no qualifier.
const WORKFLOW_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  NEW: ['AI_PROCESSING', 'AWAITING_ALLOCATION'],
  AI_PROCESSING: ['AWAITING_ALLOCATION'],
  AWAITING_ALLOCATION: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['AWAITING_CLIENT_INFO', 'AWAITING_INTERNAL_DEPENDENCY', 'SUBMITTED_FOR_REVIEW'],
  AWAITING_CLIENT_INFO: ['IN_PROGRESS'],
  AWAITING_INTERNAL_DEPENDENCY: ['IN_PROGRESS'],
  SUBMITTED_FOR_REVIEW: ['REVIEW_IN_PROGRESS'],
  REVIEW_IN_PROGRESS: ['CORRECTION_REQUIRED', 'APPROVED'],
  CORRECTION_REQUIRED: ['IN_PROGRESS'],
  APPROVED: ['CLIENT_DELIVERY'],
  CLIENT_DELIVERY: ['COMPLETED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
};

export function getValidNextStatuses(from: TaskStatus): TaskStatus[] {
  const forward = WORKFLOW_TRANSITIONS[from];
  return TERMINAL_STATUSES.includes(from) ? forward : [...forward, 'CANCELLED'];
}

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return getValidNextStatuses(from).includes(to);
}

// Which permission a transition needs, keyed by the *target* status. Review decisions
// (picking up a submission, approving, sending back for correction) need task:review;
// cancelling needs task:cancel; every other forward-progress transition is the general
// "move a task's own status along" task:updateStatus.
export function permissionForTransition(to: TaskStatus): Permission {
  if (to === 'CANCELLED') return 'task:cancel';
  if (to === 'REVIEW_IN_PROGRESS' || to === 'APPROVED' || to === 'CORRECTION_REQUIRED') {
    return 'task:review';
  }
  return 'task:updateStatus';
}

// Task.assignedToId doesn't exist yet (Assignment is its own later day), so - like task list/
// detail scoping - this can't yet restrict "your own tasks" for task:updateStatus; any holder
// of the relevant permission can transition any task in the org for now.
export async function transitionTaskStatus(
  organisationId: string,
  taskId: string,
  actorUserId: string,
  toStatus: TaskStatus,
) {
  const task = await db.task.findFirst({ where: { id: taskId, organisationId } });
  if (!task) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  }

  if (!isValidTransition(task.status, toStatus)) {
    await db.taskStatusHistory.create({
      data: {
        organisationId,
        taskId,
        fromStatus: task.status,
        toStatus,
        succeeded: false,
        reason: `${task.status} cannot transition to ${toStatus}.`,
        changedById: actorUserId,
      },
    });
    throw new ApiError(
      400,
      'INVALID_TRANSITION',
      `A task cannot move from ${task.status} to ${toStatus}.`,
    );
  }

  const [, updated] = await db.$transaction([
    db.taskStatusHistory.create({
      data: {
        organisationId,
        taskId,
        fromStatus: task.status,
        toStatus,
        succeeded: true,
        changedById: actorUserId,
      },
    }),
    db.task.update({ where: { id: taskId }, data: { status: toStatus } }),
  ]);

  return updated;
}
