import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { createService, listServiceTree } from '@/modules/services/service.service';

const skillLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

const createServiceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  parentId: z.string().uuid().nullish(),
  departmentId: z.string().uuid().nullish(),
  expectedSkillLevel: z.enum(skillLevels).nullish(),
  turnaroundDays: z.number().int().positive().nullish(),
  estimatedEffortMinHours: z.number().positive().nullish(),
  estimatedEffortMaxHours: z.number().positive().nullish(),
  reviewRequired: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  standardDocuments: z.string().trim().max(2000).nullish(),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'service:view');
    const { searchParams } = new URL(request.url);
    const tree = await listServiceTree(user.organisationId, {
      includeInactive: searchParams.get('includeInactive') === 'true',
    });
    return NextResponse.json({ services: tree });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'service:manage');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const data = createServiceSchema.parse(body);
    const service = await createService(user.organisationId, data);
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
