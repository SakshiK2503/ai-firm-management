import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { createEmployee, listEmployees } from '@/modules/identity/employee.service';

const createEmployeeSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  departmentId: z.string().min(1, 'Department is required'),
  roleId: z.string().min(1, 'Role is required'),
  managerId: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'employee:view');
    const { searchParams } = new URL(request.url);
    const employees = await listEmployees(user.organisationId, {
      search: searchParams.get('search') ?? undefined,
      includeInactive: searchParams.get('includeInactive') === 'true',
    });
    return NextResponse.json({ employees });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'employee:manage');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const input = createEmployeeSchema.parse(body);
    const employee = await createEmployee(user.organisationId, input);
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
