import { describe, expect, it } from 'vitest';
import { POST } from './route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/health/echo', { method: 'POST', body: JSON.stringify(body) }),
  );
}

describe('POST /api/health/echo', () => {
  it('echoes back a valid message', async () => {
    const response = await post({ message: 'hello' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: 'hello' });
  });

  it('returns a predictable VALIDATION_ERROR for an invalid payload', async () => {
    const response = await post({ message: '' });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns INVALID_JSON for a malformed body', async () => {
    const response = await POST(
      new Request('http://localhost/api/health/echo', { method: 'POST', body: '{not json' }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });
});
