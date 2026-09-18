import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { createDepartment, listDepartments } from '@/modules/identity/department.service';

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'department:view');
    const { searchParams } = new URL(request.url);
    const departments = await listDepartments(user.organisationId, {
      search: searchParams.get('search') ?? undefined,
      includeInactive: searchParams.get('includeInactive') === 'true',
    });
    return NextResponse.json({ departments });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'department:manage');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { name } = createDepartmentSchema.parse(body);
    const department = await createDepartment(user.organisationId, name);
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
