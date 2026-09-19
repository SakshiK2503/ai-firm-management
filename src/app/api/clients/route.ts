import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { createClient, listClients } from '@/modules/clients/client.service';

const createClientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'client:view');
    const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'client:viewAll') : false;

    const { searchParams } = new URL(request.url);
    const result = await listClients(user.organisationId, {
      search: searchParams.get('search') ?? undefined,
      includeInactive: searchParams.get('includeInactive') === 'true',
      scope: canViewAll ? 'all' : 'assigned',
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'client:editStructural');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { name } = createClientSchema.parse(body);
    const client = await createClient(user.organisationId, name);
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
