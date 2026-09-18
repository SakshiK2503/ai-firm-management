import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';

const SEED_ORG_ID = 'seed-org';

/** Dev-only seed credential - not a real secret, just a known login for local testing. */
export const SEED_OWNER_EMAIL = 'owner@zelox.in';
export const SEED_OWNER_PASSWORD = 'ChangeMe123!';

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
    where: { organisationId_email: { organisationId: organisation.id, email: SEED_OWNER_EMAIL } },
    update: {},
    create: {
      organisationId: organisation.id,
      email: SEED_OWNER_EMAIL,
      name: 'Firm Owner',
      passwordHash: await hashPassword(SEED_OWNER_PASSWORD),
      departmentId: departments[0].id,
      roleId: roles[0].id,
    },
  });

  return { organisation, departments, roles, owner };
}
