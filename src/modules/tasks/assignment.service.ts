import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';

const EMPLOYEE_OPTION_SELECT = {
  id: true,
  name: true,
  email: true,
  department: { select: { id: true, name: true } },
};

// "Eligible" here is a deliberately small MVP proxy, not PRD §13's full Allocation Engine
// (department + skill + authority + client restrictions + experience level, capacity, existing
// deadlines, complexity, proficiency, availability, continuity) - that's its own later phase
// ("Allocation Engine"), needing infrastructure (capacity model, scoring) this day doesn't build.
// Eligible here means: active, and in the task's own department when the task has one (the
// first and most basic factor PRD §13 itself lists) - a task with no department imposes no
// department restriction.
export async function listEligibleEmployees(organisationId: string, taskId: string) {
  const task = await db.task.findFirst({ where: { id: taskId, organisationId } });
  if (!task) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  }

  return db.user.findMany({
    where: {
      organisationId,
      isActive: true,
      ...(task.departmentId ? { departmentId: task.departmentId } : {}),
    },
    select: EMPLOYEE_OPTION_SELECT,
    orderBy: { name: 'asc' },
  });
}

async function assertEmployeeEligible(
  organisationId: string,
  employeeId: string,
  taskDepartmentId: string | null,
) {
  const employee = await db.user.findFirst({ where: { id: employeeId, organisationId } });
  if (!employee) {
    throw new ApiError(400, 'INVALID_EMPLOYEE', 'Employee not found.');
  }
  if (!employee.isActive) {
    throw new ApiError(400, 'EMPLOYEE_INACTIVE', 'Cannot assign a task to an inactive employee.');
  }
  if (taskDepartmentId && employee.departmentId !== taskDepartmentId) {
    throw new ApiError(
      400,
      'EMPLOYEE_INELIGIBLE',
      'This employee is not in the department responsible for this task.',
    );
  }
}

// First-time assignment only - deliberately requires AWAITING_ALLOCATION (the status whose
// whole purpose is "ready for an employee to be assigned") and no existing assignee. Changing
// the assignee on an already-assigned task is reassignment, its own later day (needs its own
// "history preserved" audit trail, not built here).
export async function assignTask(
  organisationId: string,
  taskId: string,
  actorUserId: string,
  employeeId: string,
) {
  const task = await db.task.findFirst({ where: { id: taskId, organisationId } });
  if (!task) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  }
  // Checked before the status check, not after - assignment always moves status off
  // AWAITING_ALLOCATION in the same transaction that sets assignedToId, so an already-assigned
  // task would otherwise always be caught by the (less specific) status check below instead,
  // making this one unreachable and hiding the actual reason.
  if (task.assignedToId) {
    throw new ApiError(400, 'ALREADY_ASSIGNED', 'This task is already assigned.');
  }
  if (task.status !== 'AWAITING_ALLOCATION') {
    throw new ApiError(
      400,
      'INVALID_TRANSITION',
      'A task must be in Awaiting Allocation status before it can be assigned.',
    );
  }

  await assertEmployeeEligible(organisationId, employeeId, task.departmentId);

  const [, updated] = await db.$transaction([
    db.taskStatusHistory.create({
      data: {
        organisationId,
        taskId,
        fromStatus: task.status,
        toStatus: 'ASSIGNED',
        succeeded: true,
        changedById: actorUserId,
      },
    }),
    db.task.update({
      where: { id: taskId },
      data: { assignedToId: employeeId, status: 'ASSIGNED' },
    }),
  ]);

  return updated;
}
