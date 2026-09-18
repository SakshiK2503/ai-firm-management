import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/modules/kernel/db';

export const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function createSession(userId: string, organisationId: string) {
  return db.session.create({
    data: { userId, organisationId, expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
  });
}

/** Sliding expiry: extends a still-valid session by another full duration. Called on every
 * successful getCurrentUser() check (see /api/auth/me) so an active session doesn't expire out
 * from under someone mid-use. */
export function refreshSession(sessionId: string) {
  return db.session.update({
    where: { id: sessionId },
    data: { expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
  });
}

export function destroySession(sessionId: string) {
  return db.session.deleteMany({ where: { id: sessionId } });
}

/** Attaches the session cookie to an outgoing response. Uses NextResponse's own cookie jar
 * (not next/headers' cookies()) so this stays plain-object testable outside a real request. */
export function attachSessionCookie(
  response: NextResponse,
  session: { id: string; expiresAt: Date },
) {
  response.cookies.set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt,
  });
}

async function findValidSession(sessionId: string | undefined) {
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  return session;
}

/** For Route Handlers, which receive a NextRequest directly. */
export async function getCurrentUser(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await findValidSession(sessionId);
  return session ? { user: session.user, session } : null;
}

/** For Server Components/layouts, which don't receive a request object and instead read
 * cookies via next/headers. Prisma needs the Node.js runtime (not Edge), which is exactly what
 * Server Components already run in - so this, not middleware, is where page protection lives. */
export async function getCurrentUserFromCookies() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await findValidSession(sessionId);
  return session?.user ?? null;
}
