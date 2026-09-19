import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import {
  assignEmployeeSkill,
  createSkill,
  listEmployeeSkills,
  listSkills,
  removeEmployeeSkill,
  updateSkill,
} from './skill.service';

describe('skill service', () => {
  let organisationId: string;
  let employeeId: string;

  beforeAll(async () => {
    const organisation = await db.organisation.create({
      data: { name: `Skill Service Test Org ${crypto.randomUUID()}` },
    });
    organisationId = organisation.id;

    employeeId = (
      await db.user.create({
        data: {
          organisationId,
          email: `person-${crypto.randomUUID()}@example.com`,
          name: 'Test Person',
          passwordHash: await hashPassword('irrelevant'),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await db.organisation.delete({ where: { id: organisationId } });
    await db.$disconnect();
  });

  it('creates a skill and rejects a duplicate name in the same organisation', async () => {
    const skill = await createSkill(organisationId, 'GST Filing');
    expect(skill.name).toBe('GST Filing');
    expect(skill.isActive).toBe(true);

    await expect(createSkill(organisationId, 'GST Filing')).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('lists only active skills by default, and includes an employee count', async () => {
    const active = await createSkill(organisationId, 'Audit Planning');
    const disabled = await createSkill(organisationId, 'Legacy Skill');
    await updateSkill(organisationId, disabled.id, { isActive: false });

    await assignEmployeeSkill(organisationId, employeeId, active.id, 'ADVANCED');

    const visible = await listSkills(organisationId);
    expect(visible.some((s) => s.name === 'Legacy Skill')).toBe(false);
    const found = visible.find((s) => s.id === active.id);
    expect(found?.employeeCount).toBe(1);

    const all = await listSkills(organisationId, { includeInactive: true });
    expect(all.some((s) => s.name === 'Legacy Skill')).toBe(true);
  });

  it('assigns a skill to an employee and updates the level on re-assignment', async () => {
    const skill = await createSkill(organisationId, 'Tax Advisory');

    const assigned = await assignEmployeeSkill(organisationId, employeeId, skill.id, 'BEGINNER');
    expect(assigned.level).toBe('BEGINNER');

    const reassigned = await assignEmployeeSkill(organisationId, employeeId, skill.id, 'EXPERT');
    expect(reassigned.level).toBe('EXPERT');

    const skills = await listEmployeeSkills(organisationId, employeeId);
    expect(skills.filter((s) => s.skill.id === skill.id)).toHaveLength(1);
  });

  it('rejects assigning an unknown or disabled skill', async () => {
    await expect(
      assignEmployeeSkill(
        organisationId,
        employeeId,
        '00000000-0000-0000-0000-000000000000',
        'BEGINNER',
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_SKILL' });

    const disabled = await createSkill(organisationId, 'Disabled Skill');
    await updateSkill(organisationId, disabled.id, { isActive: false });

    await expect(
      assignEmployeeSkill(organisationId, employeeId, disabled.id, 'BEGINNER'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'SKILL_DISABLED' });
  });

  it('removes an assigned skill, and 404s removing one that was never assigned', async () => {
    const skill = await createSkill(organisationId, 'Bookkeeping');
    await assignEmployeeSkill(organisationId, employeeId, skill.id, 'INTERMEDIATE');

    await removeEmployeeSkill(organisationId, employeeId, skill.id);
    const skills = await listEmployeeSkills(organisationId, employeeId);
    expect(skills.some((s) => s.skill.id === skill.id)).toBe(false);

    await expect(removeEmployeeSkill(organisationId, employeeId, skill.id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
