import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { createEngagement, listEngagementsForEntity } from '@/modules/services/engagement.service';

const billingStructures = ['MONTHLY', 'ASSIGNMENT'] as const;

const createEngagementSchema = z.object({
  serviceId: z.string().uuid(),
  engagementStart: z.coerce.date(),
  billingStructure: z.enum(billingStructures),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:view');
    const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'client:viewAll') : false;
    if (!canViewAll) {
      throw new ApiError(404, 'NOT_FOUND', 'Entity not found.');
    }

    const { id, entityId } = await params;
    const engagements = await listEngagementsForEntity(user.organisationId, id, entityId);
    return NextResponse.json({ engagements });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:editStructural');
    const { id, entityId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const input = createEngagementSchema.parse(body);
    const engagement = await createEngagement(user.organisationId, id, entityId, input);
    return NextResponse.json({ engagement }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
