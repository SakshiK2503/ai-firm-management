// No `server-only` guard here: prisma/seed-data.ts imports hashPassword outside the Next.js
// app. Unlike db.ts, bcryptjs *can* bundle into a browser build without erroring, so this
// relies on nothing ever importing it from a Client Component rather than a build-time
// guarantee - every current caller (auth.service.ts, seed-data.ts) is server-side/script-only.
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
