import { NextResponse, type NextRequest } from 'next/server';
import { toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { removeEmployeeSkill } from '@/modules/identity/skill.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'skill:manage');
    const { id, skillId } = await params;
    await removeEmployeeSkill(user.organisationId, id, skillId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
