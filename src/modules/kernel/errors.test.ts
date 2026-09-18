import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from './errors';

describe('toApiErrorResponse', () => {
  it('maps an ApiError to its own status/code/message', async () => {
    const response = toApiErrorResponse(new ApiError(404, 'NOT_FOUND', 'Client not found'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
  });

  it('maps a ZodError to a 400 VALIDATION_ERROR with issue details', async () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);

    const response = toApiErrorResponse(result.error);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it('maps an unexpected error to a 500 INTERNAL_ERROR without leaking internals', async () => {
    const response = toApiErrorResponse(new Error('database connection string was wrong'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
    });
  });
});
