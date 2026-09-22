'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

type Status =
  | 'NEW'
  | 'AI_PROCESSING'
  | 'AWAITING_ALLOCATION'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'AWAITING_CLIENT_INFO'
  | 'AWAITING_INTERNAL_DEPENDENCY'
  | 'SUBMITTED_FOR_REVIEW'
  | 'REVIEW_IN_PROGRESS'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'CLIENT_DELIVERY'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';

const REVIEW_STATUSES: Status[] = ['REVIEW_IN_PROGRESS', 'APPROVED', 'CORRECTION_REQUIRED'];

function permissionForTransition(to: Status): 'updateStatus' | 'review' | 'cancel' {
  if (to === 'CANCELLED') return 'cancel';
  if (REVIEW_STATUSES.includes(to)) return 'review';
  return 'updateStatus';
}

export function TaskStatusControl({
  taskId,
  initialStatus,
  validNextStatuses,
  canUpdateStatus,
  canReview,
  canCancel,
}: {
  taskId: string;
  initialStatus: Status;
  validNextStatuses: Status[];
  canUpdateStatus: boolean;
  canReview: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState<Status | null>(null);

  const permissionGranted: Record<'updateStatus' | 'review' | 'cancel', boolean> = {
    updateStatus: canUpdateStatus,
    review: canReview,
    cancel: canCancel,
  };

  const allowedNextStatuses = validNextStatuses.filter(
    (next) => permissionGranted[permissionForTransition(next)],
  );

  async function handleTransition(next: Status) {
    setError(null);
    setSubmitting(next);

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      setStatus(body.task.status);
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div>
      <p>
        Status: <strong>{status}</strong>
      </p>
      {allowedNextStatuses.length > 0 && (
        <div className={styles.statusActions}>
          {allowedNextStatuses.map((next) => (
            <button
              key={next}
              type="button"
              onClick={() => handleTransition(next)}
              disabled={isSubmitting !== null}
            >
              {isSubmitting === next ? 'Updating…' : `Move to ${next}`}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
