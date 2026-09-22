import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { permissionForTransition, transitionTaskStatus } from '@/modules/tasks/workflow.service';

const statuses = [
  'NEW',
  'AI_PROCESSING',
  'AWAITING_ALLOCATION',
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_CLIENT_INFO',
  'AWAITING_INTERNAL_DEPENDENCY',
  'SUBMITTED_FOR_REVIEW',
  'REVIEW_IN_PROGRESS',
  'CORRECTION_REQUIRED',
  'APPROVED',
  'CLIENT_DELIVERY',
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED',
] as const;

const updateStatusSchema = z.object({ status: z.enum(statuses) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // task:view is the baseline gate (confirms the caller is logged in and has some task
    // access) - the *specific* permission this transition needs depends on the requested target
    // status, so it's checked below once the body is parsed, not up front like other routes.
    const { user } = await requirePermission(request, 'task:view');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { status } = updateStatusSchema.parse(body);

    const requiredPermission = permissionForTransition(status);
    const allowed = user.roleId ? await roleHasPermission(user.roleId, requiredPermission) : false;
    if (!allowed) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to do this.');
    }

    const task = await transitionTaskStatus(user.organisationId, id, user.id, status);
    return NextResponse.json({ task });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
