import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/modules/kernel/db';

export const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function createSession(userId: string, organisationId: string) {
  return db.session.create({
    data: { userId, organisationId, expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
  });
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

export async function getCurrentUser(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  return session.user;
}
