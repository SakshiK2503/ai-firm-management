import { Prisma } from '@/generated/prisma/client';

/** Prisma's P2002 - a @@unique constraint was violated. Every feature with a uniqueness rule
 * (department name, employee email, ...) hits this the same way, so it's a shared helper. */
export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
