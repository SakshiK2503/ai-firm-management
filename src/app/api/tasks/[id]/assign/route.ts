import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { assignTask } from '@/modules/tasks/assignment.service';

const assignSchema = z.object({ employeeId: z.string().uuid() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // There's no dedicated task:assign permission in the catalog - task:reassign ("Reassign a
    // task to a different employee") covers both the first assignment and later reassignment.
    const { user } = await requirePermission(request, 'task:reassign');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { employeeId } = assignSchema.parse(body);
    const task = await assignTask(user.organisationId, id, user.id, employeeId);
    return NextResponse.json({ task });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
