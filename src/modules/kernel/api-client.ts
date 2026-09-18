// Client-side helper for turning an ApiErrorBody (see kernel/errors.ts) into a message a user
// can act on. A VALIDATION_ERROR's top-level message is a generic "the payload is invalid" -
// the useful, field-specific message lives in `details` (Zod's issues array).
export function extractErrorMessage(body: unknown, fallback = 'Something went wrong.'): string {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return fallback;
  }

  const error = (body as { error?: { code?: string; message?: string; details?: unknown } }).error;
  if (!error) {
    return fallback;
  }

  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    const firstIssue = error.details[0] as { message?: string } | undefined;
    if (firstIssue?.message) {
      return firstIssue.message;
    }
  }

  return error.message ?? fallback;
}
