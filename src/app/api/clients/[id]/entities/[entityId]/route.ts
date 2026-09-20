import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getEntity, updateEntity } from '@/modules/clients/entity.service';

const updateEntitySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long').optional(),
    pan: z.string().trim().min(1).nullable().optional(),
    gstin: z.string().trim().min(1).nullable().optional(),
    cin: z.string().trim().min(1).nullable().optional(),
    accountManagerId: z.string().min(1).nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    email: z.string().trim().email('Enter a valid email address').nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

async function assertCanViewAll(userRoleId: string | null) {
  const canViewAll = userRoleId ? await roleHasPermission(userRoleId, 'client:viewAll') : false;
  if (!canViewAll) {
    throw new ApiError(404, 'NOT_FOUND', 'Entity not found.');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:view');
    await assertCanViewAll(user.roleId);
    const { entityId } = await params;
    const entity = await getEntity(user.organisationId, entityId);
    return NextResponse.json({ entity });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:editStructural');
    const { entityId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const data = updateEntitySchema.parse(body);
    const entity = await updateEntity(user.organisationId, entityId, data);
    return NextResponse.json({ entity });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
