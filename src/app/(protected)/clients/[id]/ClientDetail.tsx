'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

interface Client {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export function ClientDetail({ client, canManage }: { client: Client; canManage: boolean }) {
  const router = useRouter();
  const [isEditing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: client.name, isActive: client.isActive });

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(extractErrorMessage(body));
        return;
      }

      setEditing(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>{client.name}</h1>

      {!isEditing ? (
        <>
          <dl className={styles.detailList}>
            <dt>Status</dt>
            <dd>{client.isActive ? 'Active' : 'Inactive'}</dd>
            <dt>Created</dt>
            <dd>{new Date(client.createdAt).toLocaleDateString()}</dd>
          </dl>
          {canManage && (
            <button type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </>
      ) : (
        <form onSubmit={handleSave} className={styles.editForm}>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            Active
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

      <section className={styles.section}>
        <p>Legal entities, contacts, and engagements land in later roadmap days.</p>
      </section>
    </div>
  );
}
