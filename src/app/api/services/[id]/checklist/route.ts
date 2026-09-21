import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import {
  createChecklistTemplate,
  getChecklistForService,
} from '@/modules/services/checklist.service';

const createChecklistSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  items: z.array(z.string().trim().min(1).max(200)).min(1, 'Add at least one checklist item'),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'service:view');
    const { id } = await params;
    const checklist = await getChecklistForService(user.organisationId, id);
    return NextResponse.json({ checklist });
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

    const { name, items } = createChecklistSchema.parse(body);
    const checklist = await createChecklistTemplate(user.organisationId, id, name, items);
    return NextResponse.json({ checklist }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
