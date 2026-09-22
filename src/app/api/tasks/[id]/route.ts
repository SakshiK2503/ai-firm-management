import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getTask } from '@/modules/tasks/task.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'task:view');
    // Mirrors Client's own scoping - no assignment mechanism yet (see docs/RBAC.md's known
    // gaps), so the honest interim behaviour is no access, not firm-wide access.
    const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'task:viewAll') : false;
    if (!canViewAll) {
      throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
    }

    const { id } = await params;
    const task = await getTask(user.organisationId, id);
    return NextResponse.json({ task });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
