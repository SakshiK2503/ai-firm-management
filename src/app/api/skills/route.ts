import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { createSkill, listSkills } from '@/modules/identity/skill.service';

const createSkillSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'skill:view');
    const { searchParams } = new URL(request.url);
    const skills = await listSkills(user.organisationId, {
      search: searchParams.get('search') ?? undefined,
      includeInactive: searchParams.get('includeInactive') === 'true',
    });
    return NextResponse.json({ skills });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requirePermission(request, 'skill:manage');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { name } = createSkillSchema.parse(body);
    const skill = await createSkill(user.organisationId, name);
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
