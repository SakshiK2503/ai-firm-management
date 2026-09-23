import { NextResponse, type NextRequest } from 'next/server';
import { toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { listEligibleEmployees } from '@/modules/tasks/assignment.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'task:reassign');
    const { id } = await params;
    const employees = await listEligibleEmployees(user.organisationId, id);
    return NextResponse.json({ employees });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
