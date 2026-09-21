'use client';

import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

export function ClientInstructions({
  clientId,
  initialInstructions,
  canManage,
}: {
  clientId: string;
  initialInstructions: string | null;
  canManage: boolean;
}) {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [isEditing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialInstructions ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${clientId}/instructions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: draft.trim() || null }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      setInstructions(body.client.instructions);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.section}>
      <h2>Instructions</h2>

      {!isEditing ? (
        <>
          <p>{instructions ?? 'No instructions recorded yet.'}</p>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setDraft(instructions ?? '');
                setEditing(true);
              }}
            >
              Edit instructions
            </button>
          )}
        </>
      ) : (
        <form onSubmit={handleSave} className={styles.instructionsForm}>
          <label>
            Instructions
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              aria-label="Instructions"
            />
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
