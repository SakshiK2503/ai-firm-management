import { db } from '@/modules/kernel/db';

const SEED_ORG_ID = 'seed-org';

/** Idempotent: safe to run repeatedly against a non-empty database. */
export async function seedDatabase() {
  const organisation = await db.organisation.upsert({
    where: { id: SEED_ORG_ID },
    update: {},
    create: { id: SEED_ORG_ID, name: 'Zelox & Co' },
  });

  const departments = await Promise.all(
    ['Accounts', 'Tax', 'Audit'].map((name) =>
      db.department.upsert({
        where: { organisationId_name: { organisationId: organisation.id, name } },
        update: {},
        create: { organisationId: organisation.id, name },
      }),
    ),
  );

  const roles = await Promise.all(
    ['Partner', 'Manager', 'Preparer'].map((name) =>
      db.role.upsert({
        where: { organisationId_name: { organisationId: organisation.id, name } },
        update: {},
        create: { organisationId: organisation.id, name },
      }),
    ),
  );

  const owner = await db.user.upsert({
    where: { organisationId_email: { organisationId: organisation.id, email: 'owner@zelox.in' } },
    update: {},
    create: {
      organisationId: organisation.id,
      email: 'owner@zelox.in',
      name: 'Firm Owner',
      departmentId: departments[0].id,
      roleId: roles[0].id,
    },
  });

  return { organisation, departments, roles, owner };
}
