import { NextResponse, type NextRequest } from 'next/server';
import { toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { deleteAvailability } from '@/modules/identity/availability.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; availabilityId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'availability:manage');
    const { availabilityId } = await params;
    await deleteAvailability(user.organisationId, availabilityId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
