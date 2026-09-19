import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { createAvailability, listAvailability } from '@/modules/identity/availability.service';

const dateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Enter a valid date',
});

const createAvailabilitySchema = z
  .object({
    type: z.enum(['LEAVE', 'SICK', 'UNAVAILABLE']),
    startDate: dateSchema,
    endDate: dateSchema,
    reason: z.string().trim().max(500, 'Reason is too long').optional(),
  })
  .transform((data) => ({
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
  }));

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'availability:view');
    const { id } = await params;
    const availability = await listAvailability(user.organisationId, id);
    return NextResponse.json({ availability });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'availability:manage');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const input = createAvailabilitySchema.parse(body);
    const availability = await createAvailability(user.organisationId, { userId: id, ...input });
    return NextResponse.json({ availability }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
