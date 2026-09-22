import { describe, expect, it } from 'vitest';
import type { TaskStatus } from '@/generated/prisma/client';
import {
  getValidNextStatuses,
  isValidTransition,
  permissionForTransition,
} from './workflow.service';

const ALL_STATUSES: TaskStatus[] = [
  'NEW',
  'AI_PROCESSING',
  'AWAITING_ALLOCATION',
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_CLIENT_INFO',
  'AWAITING_INTERNAL_DEPENDENCY',
  'SUBMITTED_FOR_REVIEW',
  'REVIEW_IN_PROGRESS',
  'CORRECTION_REQUIRED',
  'APPROVED',
  'CLIENT_DELIVERY',
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED',
];

// The PRD §12 flow's edges, independently listed here (not imported from workflow.service.ts)
// so this test actually verifies the implementation against the spec, not against itself.
// CANCELLED is reachable from every status below except the three terminal ones, added
// separately rather than repeated on every row.
const EXPECTED_EDGES: [TaskStatus, TaskStatus][] = [
  ['NEW', 'AI_PROCESSING'],
  ['NEW', 'AWAITING_ALLOCATION'],
  ['AI_PROCESSING', 'AWAITING_ALLOCATION'],
  ['AWAITING_ALLOCATION', 'ASSIGNED'],
  ['ASSIGNED', 'IN_PROGRESS'],
  ['IN_PROGRESS', 'AWAITING_CLIENT_INFO'],
  ['IN_PROGRESS', 'AWAITING_INTERNAL_DEPENDENCY'],
  ['IN_PROGRESS', 'SUBMITTED_FOR_REVIEW'],
  ['AWAITING_CLIENT_INFO', 'IN_PROGRESS'],
  ['AWAITING_INTERNAL_DEPENDENCY', 'IN_PROGRESS'],
  ['SUBMITTED_FOR_REVIEW', 'REVIEW_IN_PROGRESS'],
  ['REVIEW_IN_PROGRESS', 'CORRECTION_REQUIRED'],
  ['REVIEW_IN_PROGRESS', 'APPROVED'],
  ['CORRECTION_REQUIRED', 'IN_PROGRESS'],
  ['APPROVED', 'CLIENT_DELIVERY'],
  ['CLIENT_DELIVERY', 'COMPLETED'],
  ['COMPLETED', 'ARCHIVED'],
];

const TERMINAL_STATUSES: TaskStatus[] = ['ARCHIVED', 'CANCELLED'];

function computeExpectedValid(from: TaskStatus, to: TaskStatus): boolean {
  if (EXPECTED_EDGES.some(([f, t]) => f === from && t === to)) return true;
  if (to === 'CANCELLED' && !TERMINAL_STATUSES.includes(from)) return true;
  return false;
}

describe('isValidTransition - full PRD status matrix', () => {
  it('matches the expected graph for every one of the 15x15 status pairs', () => {
    const mismatches: string[] = [];

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const expected = computeExpectedValid(from, to);
        const actual = isValidTransition(from, to);
        if (expected !== actual) {
          mismatches.push(`${from} -> ${to}: expected ${expected}, got ${actual}`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('every valid edge from the spec is allowed', () => {
    for (const [from, to] of EXPECTED_EDGES) {
      expect(isValidTransition(from, to)).toBe(true);
    }
  });

  it('a status cannot transition to itself', () => {
    for (const status of ALL_STATUSES) {
      expect(isValidTransition(status, status)).toBe(false);
    }
  });

  it('ARCHIVED and CANCELLED are terminal - no outgoing transitions at all', () => {
    for (const status of TERMINAL_STATUSES) {
      expect(getValidNextStatuses(status)).toEqual([]);
    }
  });

  it('CANCELLED is reachable from every non-terminal status', () => {
    for (const status of ALL_STATUSES) {
      if (TERMINAL_STATUSES.includes(status)) continue;
      expect(isValidTransition(status, 'CANCELLED')).toBe(true);
    }
  });

  it('rejects an obviously out-of-order jump (NEW straight to COMPLETED)', () => {
    expect(isValidTransition('NEW', 'COMPLETED')).toBe(false);
  });

  it('rejects moving backwards out of a completed review (APPROVED back to REVIEW_IN_PROGRESS)', () => {
    expect(isValidTransition('APPROVED', 'REVIEW_IN_PROGRESS')).toBe(false);
  });
});

describe('permissionForTransition', () => {
  it('requires task:cancel only for CANCELLED', () => {
    expect(permissionForTransition('CANCELLED')).toBe('task:cancel');
  });

  it('requires task:review for the reviewer decision statuses', () => {
    expect(permissionForTransition('REVIEW_IN_PROGRESS')).toBe('task:review');
    expect(permissionForTransition('APPROVED')).toBe('task:review');
    expect(permissionForTransition('CORRECTION_REQUIRED')).toBe('task:review');
  });

  it('requires task:updateStatus for every other status', () => {
    const reviewOrCancel = new Set([
      'CANCELLED',
      'REVIEW_IN_PROGRESS',
      'APPROVED',
      'CORRECTION_REQUIRED',
    ]);
    for (const status of ALL_STATUSES) {
      if (reviewOrCancel.has(status)) continue;
      expect(permissionForTransition(status)).toBe('task:updateStatus');
    }
  });
});
