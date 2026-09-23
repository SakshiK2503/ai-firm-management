import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getTask } from '@/modules/tasks/task.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'task:view');
    const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'task:viewAll') : false;

    const { id } = await params;
    const task = await getTask(user.organisationId, id);

    // Without task:viewAll, access is limited to a task actually assigned to this caller
    // (task:view's own description: "View tasks assigned to you") - now meaningful since
    // Assignment (Day 49) added assignedToId, closing the "no assignment mechanism yet" gap.
    if (!canViewAll && task.assignedToId !== user.id) {
      throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
    }

    return NextResponse.json({ task });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
