import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getClient, updateClient } from '@/modules/clients/client.service';

const updateClientSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long').optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'client:view');
    // Mirrors listClients' scoping: without client:viewAll there's no Task/assignment table yet
    // to determine "assigned to me" against, so the honest interim behaviour is no access, not
    // firm-wide access - see docs/RBAC.md's "known gaps" section.
    const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'client:viewAll') : false;
    if (!canViewAll) {
      throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
    }

    const { id } = await params;
    const client = await getClient(user.organisationId, id);
    return NextResponse.json({ client });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'client:editStructural');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const data = updateClientSchema.parse(body);
    const client = await updateClient(user.organisationId, id, data);
    return NextResponse.json({ client });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
