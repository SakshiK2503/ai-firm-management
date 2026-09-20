import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { createEntity, listEntitiesForClient } from '@/modules/clients/entity.service';

const createEntitySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
  pan: z.string().trim().min(1).optional(),
  gstin: z.string().trim().min(1).optional(),
  cin: z.string().trim().min(1).optional(),
  accountManagerId: z.string().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().trim().email('Enter a valid email address').optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'client:view');
    // Mirrors /api/clients/[id]'s scoping - no Task table yet to determine "assigned to me"
    // against, so a client:view-only role has no access to its entities either.
    const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'client:viewAll') : false;
    if (!canViewAll) {
      throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
    }

    const { id } = await params;
    const entities = await listEntitiesForClient(user.organisationId, id);
    return NextResponse.json({ entities });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'client:editStructural');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const input = createEntitySchema.parse(body);
    const entity = await createEntity(user.organisationId, { clientId: id, ...input });
    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
