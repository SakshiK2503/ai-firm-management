import { db } from '@/modules/kernel/db';
import { seedDatabase } from './seed-data';

async function main() {
  const { organisation, departments, roles } = await seedDatabase();
  console.log(
    `Seeded organisation "${organisation.name}" with ${departments.length} departments, ${roles.length} roles, and 1 user.`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
