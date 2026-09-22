import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { updateEngagement } from '@/modules/services/engagement.service';

const billingStructures = ['MONTHLY', 'ASSIGNMENT'] as const;

const updateEngagementSchema = z
  .object({
    engagementStart: z.coerce.date().optional(),
    billingStructure: z.enum(billingStructures).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string; engagementId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:editStructural');
    const { id, entityId, engagementId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const data = updateEngagementSchema.parse(body);
    const engagement = await updateEngagement(
      user.organisationId,
      id,
      entityId,
      engagementId,
      data,
    );
    return NextResponse.json({ engagement });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
