import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { updateDepartment } from '@/modules/identity/department.service';

const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: 'Provide at least one field to update.',
  });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'department:manage');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const data = updateDepartmentSchema.parse(body);
    const department = await updateDepartment(user.organisationId, id, data);
    return NextResponse.json({ department });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
