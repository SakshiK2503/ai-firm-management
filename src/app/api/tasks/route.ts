import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { createTask, listTasks } from '@/modules/tasks/task.service';

const priorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;
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

const createTaskSchema = z.object({
  clientId: z.string().uuid(),
  clientEntityId: z.string().uuid(),
  serviceId: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required').max(300, 'Title is too long'),
  priority: z.enum(priorities).optional(),
});

const listTasksQuerySchema = z.object({
  status: z.enum(statuses).optional(),
  clientId: z.string().uuid().optional(),
  priority: z.enum(priorities).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'task:view');
    const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'task:viewAll') : false;

    const { searchParams } = new URL(request.url);
    const filters = listTasksQuerySchema.parse({
      status: searchParams.get('status') ?? undefined,
      clientId: searchParams.get('clientId') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
    });

    const tasks = await listTasks(user.organisationId, {
      scope: canViewAll ? 'all' : 'assigned',
      ...filters,
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'task:create');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const input = createTaskSchema.parse(body);
    const task = await createTask(user.organisationId, input);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
