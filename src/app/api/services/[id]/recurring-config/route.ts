import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import {
  createRecurringConfig,
  getRecurringConfig,
  updateRecurringConfig,
} from '@/modules/services/recurring.service';

const frequencies = ['MONTHLY', 'QUARTERLY', 'ANNUALLY'] as const;

const recurringConfigSchema = z.object({
  frequency: z.enum(frequencies),
  dayOfMonth: z.number().int().min(1).max(28),
  monthOfYear: z.number().int().min(1).max(12).nullish(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'service:view');
    const { id } = await params;
    const config = await getRecurringConfig(user.organisationId, id);
    return NextResponse.json({ config });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'service:manage');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const input = recurringConfigSchema.parse(body);
    const config = await createRecurringConfig(user.organisationId, id, input);
    return NextResponse.json({ config }, { status: 201 });
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

    const input = recurringConfigSchema.parse(body);
    const config = await updateRecurringConfig(user.organisationId, id, input);
    return NextResponse.json({ config });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
