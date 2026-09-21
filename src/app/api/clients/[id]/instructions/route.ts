import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { updateClient } from '@/modules/clients/client.service';

const updateInstructionsSchema = z.object({
  instructions: z.string().trim().max(5000, 'Instructions are too long').nullable(),
});

// Separate from PATCH /api/clients/[id] deliberately - instructions are lightweight, day-to-day
// content gated on client:editContact (Manager+Partner), unlike name/isActive which are
// client:editStructural (Partner-only). Keeping them as separate routes means each one has a
// single, simple permission check instead of branching on which fields the body touches.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'client:editContact');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { instructions } = updateInstructionsSchema.parse(body);
    const client = await updateClient(user.organisationId, id, { instructions });
    return NextResponse.json({ client });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
