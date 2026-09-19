import { db } from '@/modules/kernel/db';
import { ApiError } from '@/modules/kernel/errors';
import { isUniqueConstraintError } from '@/modules/kernel/db-errors';
import type { SkillLevel } from '@/generated/prisma/client';

export async function createSkill(organisationId: string, name: string) {
  try {
    return await db.skill.create({ data: { organisationId, name } });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', `A skill named "${name}" already exists.`);
    }
    throw error;
  }
}

export async function listSkills(
  organisationId: string,
  options: { search?: string; includeInactive?: boolean } = {},
) {
  const skills = await db.skill.findMany({
    where: {
      organisationId,
      ...(options.search ? { name: { contains: options.search, mode: 'insensitive' } } : {}),
      ...(options.includeInactive ? {} : { isActive: true }),
    },
    include: { _count: { select: { employeeSkills: true } } },
    orderBy: { name: 'asc' },
  });

  return skills.map(({ _count, ...skill }) => ({ ...skill, employeeCount: _count.employeeSkills }));
}

export async function updateSkill(
  organisationId: string,
  skillId: string,
  data: { name?: string; isActive?: boolean },
) {
  const existing = await db.skill.findFirst({ where: { id: skillId, organisationId } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Skill not found.');
  }

  try {
    return await db.skill.update({ where: { id: skillId }, data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'CONFLICT', `A skill named "${data.name}" already exists.`);
    }
    throw error;
  }
}

async function assertEmployeeExists(organisationId: string, userId: string) {
  const employee = await db.user.findFirst({ where: { id: userId, organisationId } });
  if (!employee) {
    throw new ApiError(404, 'NOT_FOUND', 'Employee not found.');
  }
}

async function assertSkillAssignable(organisationId: string, skillId: string) {
  const skill = await db.skill.findFirst({ where: { id: skillId, organisationId } });
  if (!skill) {
    throw new ApiError(400, 'INVALID_SKILL', 'Skill not found.');
  }
  if (!skill.isActive) {
    throw new ApiError(400, 'SKILL_DISABLED', 'Cannot assign a disabled skill.');
  }
}

// Re-assigning a skill an employee already has updates the level rather than erroring - a
// level changing over time is the normal case, not a conflict (see the EmployeeSkill schema
// comment).
export async function assignEmployeeSkill(
  organisationId: string,
  userId: string,
  skillId: string,
  level: SkillLevel,
) {
  await assertEmployeeExists(organisationId, userId);
  await assertSkillAssignable(organisationId, skillId);

  return db.employeeSkill.upsert({
    where: { userId_skillId: { userId, skillId } },
    create: { organisationId, userId, skillId, level },
    update: { level },
    include: { skill: { select: { id: true, name: true } } },
  });
}

export async function removeEmployeeSkill(organisationId: string, userId: string, skillId: string) {
  const existing = await db.employeeSkill.findFirst({
    where: { userId, skillId, organisationId },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'This employee does not have that skill assigned.');
  }
  await db.employeeSkill.delete({ where: { id: existing.id } });
}

export async function listEmployeeSkills(organisationId: string, userId: string) {
  await assertEmployeeExists(organisationId, userId);

  return db.employeeSkill.findMany({
    where: { userId, organisationId },
    select: { id: true, level: true, skill: { select: { id: true, name: true } } },
    orderBy: { skill: { name: 'asc' } },
  });
}
