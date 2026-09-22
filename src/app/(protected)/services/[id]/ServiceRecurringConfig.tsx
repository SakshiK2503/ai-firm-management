'use client';

import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

const FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'ANNUALLY'] as const;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface RecurringConfig {
  id: string;
  frequency: (typeof FREQUENCIES)[number];
  dayOfMonth: number;
  monthOfYear: number | null;
  nextOccurrence: string;
}

export function ServiceRecurringConfig({
  serviceId,
  initialConfig,
  canManage,
}: {
  serviceId: string;
  initialConfig: RecurringConfig | null;
  canManage: boolean;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [isEditing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    frequency: (config?.frequency ?? 'MONTHLY') as (typeof FREQUENCIES)[number],
    dayOfMonth: config?.dayOfMonth?.toString() ?? '1',
    monthOfYear: config?.monthOfYear?.toString() ?? '1',
  });

  const url = `/api/services/${serviceId}/recurring-config`;

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        frequency: form.frequency,
        dayOfMonth: Number(form.dayOfMonth),
      };
      if (form.frequency === 'ANNUALLY') {
        payload.monthOfYear = Number(form.monthOfYear);
      }

      const response = await fetch(url, {
        method: config ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      setConfig(body.config);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!canManage && !config) {
    return (
      <section className={styles.section}>
        <h2>Recurrence calendar</h2>
        <p>No recurrence calendar has been set up for this service.</p>
      </section>
    );
  }

  if (isEditing || (!config && canManage)) {
    return (
      <section className={styles.section}>
        <h2>Recurrence calendar</h2>
        <form onSubmit={handleSave} className={styles.editForm}>
          <label className={styles.field}>
            Frequency
            <select
              value={form.frequency}
              onChange={(event) =>
                setForm({ ...form, frequency: event.target.value as (typeof FREQUENCIES)[number] })
              }
              aria-label="Recurrence frequency"
            >
              {FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequency}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Day of month
            <input
              type="number"
              min="1"
              max="28"
              value={form.dayOfMonth}
              onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })}
              aria-label="Day of month"
              required
            />
          </label>

          {form.frequency === 'ANNUALLY' && (
            <label className={styles.field}>
              Month
              <select
                value={form.monthOfYear}
                onChange={(event) => setForm({ ...form, monthOfYear: event.target.value })}
                aria-label="Month of year"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
            {config && (
              <button type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2>Recurrence calendar</h2>
      <dl className={styles.detailList}>
        <dt>Frequency</dt>
        <dd>{config!.frequency}</dd>
        <dt>Day of month</dt>
        <dd>{config!.dayOfMonth}</dd>
        {config!.monthOfYear && (
          <>
            <dt>Month</dt>
            <dd>{MONTH_NAMES[config!.monthOfYear - 1]}</dd>
          </>
        )}
        <dt>Next occurrence</dt>
        <dd>{new Date(config!.nextOccurrence).toLocaleDateString()}</dd>
      </dl>
      {canManage && (
        <div className={styles.actions}>
          <button type="button" onClick={() => setEditing(true)}>
            Edit recurrence
          </button>
        </div>
      )}
    </section>
  );
}
