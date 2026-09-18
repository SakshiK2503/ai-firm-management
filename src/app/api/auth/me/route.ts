import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { getCurrentUser } from '@/modules/kernel/auth/session';
import { toSafeUser } from '@/modules/identity/auth.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Not logged in.');
    }
    return NextResponse.json({ user: toSafeUser(user) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
