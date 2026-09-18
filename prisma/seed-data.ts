import { db } from '@/modules/kernel/db';
import { hashPassword } from '@/modules/kernel/auth/password';
import { PERMISSION_CATALOG, SYSTEM_ROLES } from '@/modules/kernel/rbac/permissions';
import { ROLE_PERMISSION_GRANTS, SYSTEM_ROLE_DISPLAY_NAMES } from './rbac-seed-data';

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
    SYSTEM_ROLES.map((systemRole) =>
      db.role.upsert({
        where: {
          organisationId_name: {
            organisationId: organisation.id,
            name: SYSTEM_ROLE_DISPLAY_NAMES[systemRole],
          },
        },
        update: {},
        create: { organisationId: organisation.id, name: SYSTEM_ROLE_DISPLAY_NAMES[systemRole] },
      }),
    ),
  );
  const roleByName = new Map(roles.map((role) => [role.name, role]));

  // The permission catalog is system reference data, not tenant sample data, but there's no
  // separate production-seeding mechanism yet - see docs/RBAC.md. createMany (not per-row
  // upserts) keeps this to a couple of round trips instead of dozens against the connection
  // pool.
  await db.permission.createMany({ data: [...PERMISSION_CATALOG], skipDuplicates: true });

  // Re-seed grants from scratch each run (rather than upsert-only) so the DB always matches
  // ROLE_PERMISSION_GRANTS exactly, including permissions removed from a role since the last run.
  await db.rolePermission.deleteMany({ where: { organisationId: organisation.id } });
  await db.rolePermission.createMany({
    data: SYSTEM_ROLES.flatMap((systemRole) => {
      const role = roleByName.get(SYSTEM_ROLE_DISPLAY_NAMES[systemRole]);
      if (!role)
        throw new Error(`Seeded role "${SYSTEM_ROLE_DISPLAY_NAMES[systemRole]}" not found`);

      return ROLE_PERMISSION_GRANTS[systemRole].map((permissionKey) => ({
        organisationId: organisation.id,
        roleId: role.id,
        permissionKey,
      }));
    }),
  });

  const partnerRole = roleByName.get(SYSTEM_ROLE_DISPLAY_NAMES.partner);
  if (!partnerRole) throw new Error('Seeded Partner role not found');

  const owner = await db.user.upsert({
    where: { organisationId_email: { organisationId: organisation.id, email: SEED_OWNER_EMAIL } },
    update: {},
    create: {
      organisationId: organisation.id,
      email: SEED_OWNER_EMAIL,
      name: 'Firm Owner',
      passwordHash: await hashPassword(SEED_OWNER_PASSWORD),
      departmentId: departments[0].id,
      roleId: partnerRole.id,
    },
  });

  return { organisation, departments, roles, owner };
}
