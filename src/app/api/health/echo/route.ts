import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';

const echoSchema = z.object({ message: z.string().min(1).max(200) });

/**
 * Reference implementation of the validate-then-respond convention every route handler
 * should follow: parse the body with zod, let toApiErrorResponse turn any failure (bad
 * JSON, failed validation, or anything unexpected) into the shared error shape.
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const { message } = echoSchema.parse(body);
    return NextResponse.json({ message });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
