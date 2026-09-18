import { NextResponse, type NextRequest } from 'next/server';
import { toApiErrorResponse } from '@/modules/kernel/errors';
import { destroySession, SESSION_COOKIE_NAME } from '@/modules/kernel/auth/session';

/** Idempotent: logging out when already logged out just succeeds - there's nothing to undo. */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionId) {
      await destroySession(sessionId);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
