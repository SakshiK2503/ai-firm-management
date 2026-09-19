import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { assignEmployeeSkill, listEmployeeSkills } from '@/modules/identity/skill.service';

const assignSkillSchema = z.object({
  skillId: z.string().min(1, 'Skill is required'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'skill:view');
    const { id } = await params;
    const skills = await listEmployeeSkills(user.organisationId, id);
    return NextResponse.json({ skills });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission(request, 'skill:manage');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { skillId, level } = assignSkillSchema.parse(body);
    const employeeSkill = await assignEmployeeSkill(user.organisationId, id, skillId, level);
    return NextResponse.json({ employeeSkill }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
