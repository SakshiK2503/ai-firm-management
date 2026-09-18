import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { getEmployee, updateEmployee } from '@/modules/identity/employee.service';

const updateEmployeeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
    departmentId: z.string().min(1).optional(),
    roleId: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'employee:view');
    const { id } = await params;
    const employee = await getEmployee(user.organisationId, id);
    return NextResponse.json({ employee });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'employee:manage');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const data = updateEmployeeSchema.parse(body);
    const employee = await updateEmployee(user.organisationId, id, data);
    return NextResponse.json({ employee });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
