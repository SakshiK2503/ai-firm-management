import { NextResponse, type NextRequest } from 'next/server';
import { toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { removeChecklistItem } from '@/modules/services/checklist.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'service:manage');
    const { id, itemId } = await params;
    await removeChecklistItem(user.organisationId, id, itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
