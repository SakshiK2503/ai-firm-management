import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

declare global {
  var prismaClient: PrismaClient | undefined;
}

function createPrismaClient() {
  // Kept small: prisma dev's embedded Postgres is comfortable around 10 total connections, and
  // this pool has to share that budget with every other process pointed at the same dev DB
  // (another `npm run dev`, the E2E webServer, one-off scripts like the seed).
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3 });
  return new PrismaClient({ adapter });
}

export const db = globalThis.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaClient = db;
}
