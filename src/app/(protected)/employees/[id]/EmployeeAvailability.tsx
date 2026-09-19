'use client';

import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

const AVAILABILITY_TYPES = ['LEAVE', 'SICK', 'UNAVAILABLE'] as const;
type AvailabilityType = (typeof AVAILABILITY_TYPES)[number];

interface AvailabilityRecord {
  id: string;
  type: AvailabilityType;
  startDate: string;
  endDate: string;
  reason: string | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function EmployeeAvailability({
  employeeId,
  initialAvailability,
  canManage,
}: {
  employeeId: string;
  initialAvailability: AvailabilityRecord[];
  canManage: boolean;
}) {
  const [availability, setAvailability] = useState(initialAvailability);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'LEAVE' as AvailabilityType,
    startDate: '',
    endDate: '',
    reason: '',
  });

  async function refresh() {
    const response = await fetch(`/api/employees/${employeeId}/availability`);
    if (response.ok) {
      const body = await response.json();
      setAvailability(body.availability);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/employees/${employeeId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, reason: form.reason || undefined }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(extractErrorMessage(body));
        return;
      }

      setForm({ type: 'LEAVE', startDate: '', endDate: '', reason: '' });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/employees/${employeeId}/availability/${id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      await refresh();
    }
  }

  return (
    <section className={styles.section}>
      <h2>Availability</h2>

      {availability.length === 0 ? (
        <p>No leave or unavailability recorded.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {availability.map((record) => (
              <tr key={record.id}>
                <td>{record.type}</td>
                <td>{formatDate(record.startDate)}</td>
                <td>{formatDate(record.endDate)}</td>
                <td>{record.reason ?? '—'}</td>
                {canManage && (
                  <td>
                    <button type="button" onClick={() => handleDelete(record.id)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <label className={styles.field}>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as AvailabilityType })
              }
              aria-label="Type"
            >
              {AVAILABILITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Start date
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              aria-label="Start date"
              required
            />
          </label>
          <label className={styles.field}>
            End date
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              aria-label="End date"
              required
            />
          </label>
          <label className={styles.field}>
            Reason
            <input
              type="text"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              placeholder="Optional"
              aria-label="Reason"
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add record'}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}
