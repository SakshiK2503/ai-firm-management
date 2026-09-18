import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
  it('returns 200 with an ok status body', async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });
});
