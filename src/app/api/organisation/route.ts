import { NextResponse, type NextRequest } from 'next/server';
import { toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { db } from '@/modules/kernel/db';

/**
 * Reference implementation of a permission-gated route - the pattern every future protected
 * route follows: requirePermission() first, then the actual work. organisation:manage is
 * Partner-only (see docs/RBAC.md), so this is also the first real "Partner-only" endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'organisation:manage');
    const organisation = await db.organisation.findUniqueOrThrow({
      where: { id: user.organisationId },
    });
    return NextResponse.json({ organisation: { id: organisation.id, name: organisation.name } });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
