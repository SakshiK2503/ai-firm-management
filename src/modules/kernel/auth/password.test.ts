import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a matching password against its hash', async () => {
    const hash = await hashPassword('correct-password');

    expect(await verifyPassword('correct-password', hash)).toBe(true);
  });

  it('rejects a non-matching password', async () => {
    const hash = await hashPassword('correct-password');

    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('never stores the plaintext password in the hash', async () => {
    const hash = await hashPassword('correct-password');

    expect(hash).not.toContain('correct-password');
  });
});
