'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

interface Service {
  id: string;
  name: string;
  parentId: string | null;
  departmentId: string | null;
  expectedSkillLevel: string | null;
  turnaroundDays: number | null;
  estimatedEffortMinHours: number | null;
  estimatedEffortMaxHours: number | null;
  reviewRequired: boolean;
  isRecurring: boolean;
  standardDocuments: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

export function ServiceDetail({
  service,
  departments,
  canManage,
}: {
  service: Service;
  departments: Department[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isEditing, setEditing] = useState(false);
  const [current, setCurrent] = useState(service);
  const [form, setForm] = useState({
    name: service.name,
    departmentId: service.departmentId ?? '',
    expectedSkillLevel: service.expectedSkillLevel ?? '',
    turnaroundDays: service.turnaroundDays?.toString() ?? '',
    estimatedEffortMinHours: service.estimatedEffortMinHours?.toString() ?? '',
    estimatedEffortMaxHours: service.estimatedEffortMaxHours?.toString() ?? '',
    reviewRequired: service.reviewRequired,
    isRecurring: service.isRecurring,
    standardDocuments: service.standardDocuments ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function refresh(next?: Service) {
    if (next) setCurrent(next);
    router.refresh();
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        departmentId: form.departmentId || null,
        expectedSkillLevel: form.expectedSkillLevel || null,
        turnaroundDays: form.turnaroundDays ? Number(form.turnaroundDays) : null,
        estimatedEffortMinHours: form.estimatedEffortMinHours
          ? Number(form.estimatedEffortMinHours)
          : null,
        estimatedEffortMaxHours: form.estimatedEffortMaxHours
          ? Number(form.estimatedEffortMaxHours)
          : null,
        reviewRequired: form.reviewRequired,
        isRecurring: form.isRecurring,
        standardDocuments: form.standardDocuments || null,
      };

      const response = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      await refresh(body.service);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive() {
    const response = await fetch(`/api/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current.isActive }),
    });
    const body = await response.json();
    if (response.ok) {
      await refresh(body.service);
    }
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className={styles.editForm}>
        <h1>Edit service</h1>

        <label className={styles.field}>
          Name
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            aria-label="Service name"
            required
          />
        </label>

        <label className={styles.field}>
          Department
          <select
            value={form.departmentId}
            onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
            aria-label="Department"
          >
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Expected skill level
          <select
            value={form.expectedSkillLevel}
            onChange={(event) => setForm({ ...form, expectedSkillLevel: event.target.value })}
            aria-label="Expected skill level"
          >
            <option value="">Not specified</option>
            {SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Turnaround (days)
          <input
            type="number"
            min="1"
            value={form.turnaroundDays}
            onChange={(event) => setForm({ ...form, turnaroundDays: event.target.value })}
            aria-label="Turnaround days"
          />
        </label>

        <label className={styles.field}>
          Estimated effort min (hours)
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.estimatedEffortMinHours}
            onChange={(event) => setForm({ ...form, estimatedEffortMinHours: event.target.value })}
            aria-label="Estimated effort min hours"
          />
        </label>

        <label className={styles.field}>
          Estimated effort max (hours)
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.estimatedEffortMaxHours}
            onChange={(event) => setForm({ ...form, estimatedEffortMaxHours: event.target.value })}
            aria-label="Estimated effort max hours"
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.reviewRequired}
            onChange={(event) => setForm({ ...form, reviewRequired: event.target.checked })}
          />
          Review required
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(event) => setForm({ ...form, isRecurring: event.target.checked })}
          />
          Recurring
        </label>

        <label className={styles.field}>
          Standard documents required
          <textarea
            value={form.standardDocuments}
            onChange={(event) => setForm({ ...form, standardDocuments: event.target.value })}
            aria-label="Standard documents required"
            rows={3}
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
    );
  }

  return (
    <div>
      <h1>{current.name}</h1>
      <dl className={styles.detailList}>
        <dt>Status</dt>
        <dd>{current.isActive ? 'Active' : 'Disabled'}</dd>
        <dt>Department</dt>
        <dd>{current.department?.name ?? '—'}</dd>
        <dt>Expected skill level</dt>
        <dd>{current.expectedSkillLevel ?? '—'}</dd>
        <dt>Turnaround</dt>
        <dd>{current.turnaroundDays ? `${current.turnaroundDays} day(s)` : '—'}</dd>
        <dt>Estimated effort</dt>
        <dd>
          {current.estimatedEffortMinHours || current.estimatedEffortMaxHours
            ? `${current.estimatedEffortMinHours ?? '?'}–${current.estimatedEffortMaxHours ?? '?'} hour(s)`
            : '—'}
        </dd>
        <dt>Review required</dt>
        <dd>{current.reviewRequired ? 'Yes' : 'No'}</dd>
        <dt>Recurring</dt>
        <dd>{current.isRecurring ? 'Yes' : 'No'}</dd>
        <dt>Standard documents</dt>
        <dd>{current.standardDocuments ?? '—'}</dd>
      </dl>

      {canManage && (
        <div className={styles.actions}>
          <button type="button" onClick={() => setEditing(true)}>
            Edit service
          </button>
          <button type="button" onClick={toggleActive}>
            {current.isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      )}
    </div>
  );
}
