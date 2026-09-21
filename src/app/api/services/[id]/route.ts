import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { getService, updateService } from '@/modules/services/service.service';

const skillLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
    parentId: z.string().uuid().nullish(),
    departmentId: z.string().uuid().nullish(),
    expectedSkillLevel: z.enum(skillLevels).nullish(),
    turnaroundDays: z.number().int().positive().nullish(),
    estimatedEffortMinHours: z.number().positive().nullish(),
    estimatedEffortMaxHours: z.number().positive().nullish(),
    reviewRequired: z.boolean().optional(),
    isRecurring: z.boolean().optional(),
    standardDocuments: z.string().trim().max(2000).nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'service:view');
    const { id } = await params;
    const service = await getService(user.organisationId, id);
    return NextResponse.json({ service });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'service:manage');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const data = updateServiceSchema.parse(body);
    const service = await updateService(user.organisationId, id, data);
    return NextResponse.json({ service });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
