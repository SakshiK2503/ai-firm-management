import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { attachSessionCookie, getCurrentUser, refreshSession } from '@/modules/kernel/auth/session';
import { toSafeUser } from '@/modules/identity/auth.service';

export async function GET(request: NextRequest) {
  try {
    const current = await getCurrentUser(request);
    if (!current) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Not logged in.');
    }

    const refreshed = await refreshSession(current.session.id);
    const response = NextResponse.json({ user: toSafeUser(current.user) });
    attachSessionCookie(response, refreshed);
    return response;
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
