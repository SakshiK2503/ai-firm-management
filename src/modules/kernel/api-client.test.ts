import { describe, expect, it } from 'vitest';
import { extractErrorMessage } from './api-client';

describe('extractErrorMessage', () => {
  it('surfaces the first Zod issue message for a validation error', () => {
    const body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request payload is invalid.',
        details: [{ path: ['password'], message: 'Password must be at least 8 characters' }],
      },
    };
    expect(extractErrorMessage(body)).toBe('Password must be at least 8 characters');
  });

  it('falls back to the top-level message for a non-validation error', () => {
    const body = { error: { code: 'CONFLICT', message: 'Already exists.' } };
    expect(extractErrorMessage(body)).toBe('Already exists.');
  });

  it('falls back to the default message for a malformed or missing error body', () => {
    expect(extractErrorMessage(null)).toBe('Something went wrong.');
    expect(extractErrorMessage({})).toBe('Something went wrong.');
    expect(extractErrorMessage({ error: { code: 'VALIDATION_ERROR', details: [] } })).toBe(
      'Something went wrong.',
    );
  });
});
