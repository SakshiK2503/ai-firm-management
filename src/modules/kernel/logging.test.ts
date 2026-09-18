import { describe, expect, it } from 'vitest';
import pino from 'pino';

describe('structured logging', () => {
  it('emits one JSON line per call, with a level, timestamp, message, and extra fields', () => {
    const lines: string[] = [];
    const destination = {
      write: (chunk: string) => {
        lines.push(chunk);
      },
    };
    const testLogger = pino({ timestamp: pino.stdTimeFunctions.isoTime }, destination);

    testLogger.error({ code: 'TEST_ERROR' }, 'something failed');

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.level).toBe(50);
    expect(parsed.msg).toBe('something failed');
    expect(parsed.code).toBe('TEST_ERROR');
    expect(typeof parsed.time).toBe('string');
  });
});
