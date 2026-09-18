import { describe, expect, it } from 'vitest';
import { getHealthStatus } from './health';

describe('getHealthStatus', () => {
  it('reports ok with a valid ISO timestamp', () => {
    const result = getHealthStatus();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
