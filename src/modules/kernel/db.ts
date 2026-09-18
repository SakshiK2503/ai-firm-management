import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

// No `server-only` guard here (unlike session.ts): prisma/seed-data.ts and one-off debug
// scripts legitimately import this outside the Next.js app. It's still protected from
// accidental client bundling in practice - @prisma/client and pg depend on Node's net/tls,
// which Next's client webpack build can't bundle at all, so a Client Component importing this
// fails to build immediately. See scripts/check-no-secrets-in-client-bundle.ts for the
// verification.

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
