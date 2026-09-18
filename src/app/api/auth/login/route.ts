import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { attachSessionCookie } from '@/modules/kernel/auth/session';
import { login } from '@/modules/identity/auth.service';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { email, password } = loginSchema.parse(body);
    const { user, session } = await login(email, password);

    const response = NextResponse.json({ user });
    attachSessionCookie(response, session);
    return response;
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
