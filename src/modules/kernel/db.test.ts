import { describe, expect, it } from 'vitest';
import { db } from './db';

describe('db', () => {
  it('connects to Postgres and can run a query', async () => {
    const result = await db.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;

    expect(result).toEqual([{ ok: 1 }]);
  });
});
