import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { addChecklistItem } from '@/modules/services/checklist.service';

const addItemSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(200, 'Label is too long'),
});

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

    const { label } = addItemSchema.parse(body);
    const item = await addChecklistItem(user.organisationId, id, label);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
