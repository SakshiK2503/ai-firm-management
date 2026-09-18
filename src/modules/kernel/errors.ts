import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logging';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Every API route catches into this so callers always get the same error shape,
 * regardless of whether the failure was a validation error, a deliberate ApiError,
 * or something unexpected.
 */
export function toApiErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    logger.warn({ code: error.code, statusCode: error.statusCode }, error.message);
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request payload is invalid.',
          details: error.issues,
        },
      },
      { status: 400 },
    );
  }

  logger.error({ err: error }, 'Unhandled API error');

  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
    { status: 500 },
  );
}
