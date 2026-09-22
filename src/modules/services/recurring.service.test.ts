import { describe, expect, it } from 'vitest';
import { computeNextOccurrence } from './recurring.service';

describe('computeNextOccurrence', () => {
  it('returns this month for a MONTHLY recurrence whose day has not passed yet', () => {
    const next = computeNextOccurrence(
      { frequency: 'MONTHLY', dayOfMonth: 20, monthOfYear: null },
      new Date(2026, 2, 5), // 5 March 2026
    );
    expect(next).toEqual(new Date(2026, 2, 20));
  });

  it('rolls over to next month for a MONTHLY recurrence whose day has already passed', () => {
    const next = computeNextOccurrence(
      { frequency: 'MONTHLY', dayOfMonth: 5, monthOfYear: null },
      new Date(2026, 2, 20), // 20 March 2026
    );
    expect(next).toEqual(new Date(2026, 3, 5)); // 5 April 2026
  });

  it('returns the same day when `from` lands exactly on the recurrence day', () => {
    const next = computeNextOccurrence(
      { frequency: 'MONTHLY', dayOfMonth: 15, monthOfYear: null },
      new Date(2026, 5, 15),
    );
    expect(next).toEqual(new Date(2026, 5, 15));
  });

  it('rolls a December MONTHLY recurrence into January of the next year', () => {
    const next = computeNextOccurrence(
      { frequency: 'MONTHLY', dayOfMonth: 5, monthOfYear: null },
      new Date(2026, 11, 20), // 20 December 2026
    );
    expect(next).toEqual(new Date(2027, 0, 5)); // 5 January 2027
  });

  it('picks the next calendar quarter month for a QUARTERLY recurrence', () => {
    const next = computeNextOccurrence(
      { frequency: 'QUARTERLY', dayOfMonth: 10, monthOfYear: null },
      new Date(2026, 1, 1), // 1 February 2026 - next quarter month is April
    );
    expect(next).toEqual(new Date(2026, 3, 10)); // 10 April 2026
  });

  it('stays within the current quarter month for QUARTERLY if the day has not passed', () => {
    const next = computeNextOccurrence(
      { frequency: 'QUARTERLY', dayOfMonth: 20, monthOfYear: null },
      new Date(2026, 3, 1), // 1 April 2026
    );
    expect(next).toEqual(new Date(2026, 3, 20));
  });

  it('computes the next ANNUALLY occurrence in the current year if not yet passed', () => {
    const next = computeNextOccurrence(
      { frequency: 'ANNUALLY', dayOfMonth: 15, monthOfYear: 10 },
      new Date(2026, 0, 1), // 1 January 2026 - October hasn't happened yet
    );
    expect(next).toEqual(new Date(2026, 9, 15)); // 15 October 2026
  });

  it('rolls an ANNUALLY occurrence into next year once that date has already passed', () => {
    const next = computeNextOccurrence(
      { frequency: 'ANNUALLY', dayOfMonth: 15, monthOfYear: 10 },
      new Date(2026, 10, 1), // 1 November 2026 - October has already passed
    );
    expect(next).toEqual(new Date(2027, 9, 15)); // 15 October 2027
  });
});
