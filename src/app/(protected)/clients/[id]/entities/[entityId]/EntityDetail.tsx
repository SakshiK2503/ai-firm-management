'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from '../../page.module.css';

interface Entity {
  id: string;
  name: string;
  pan: string | null;
  gstin: string | null;
  cin: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  accountManager: { id: string; name: string } | null;
}

interface EmployeeOption {
  id: string;
  name: string;
}

export function EntityDetail({
  clientId,
  entity,
  employees,
  canManage,
}: {
  clientId: string;
  entity: Entity;
  employees: EmployeeOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isEditing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: entity.name,
    pan: entity.pan ?? '',
    gstin: entity.gstin ?? '',
    cin: entity.cin ?? '',
    accountManagerId: entity.accountManager?.id ?? '',
    phone: entity.phone ?? '',
    email: entity.email ?? '',
    isActive: entity.isActive,
  });

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name: form.name,
        pan: form.pan || null,
        gstin: form.gstin || null,
        cin: form.cin || null,
        accountManagerId: form.accountManagerId || null,
        phone: form.phone || null,
        email: form.email || null,
        isActive: form.isActive,
      };
      const response = await fetch(`/api/clients/${clientId}/entities/${entity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      <h1>{entity.name}</h1>

      {!isEditing ? (
        <>
          <dl className={styles.detailList}>
            <dt>PAN</dt>
            <dd>{entity.pan ?? '—'}</dd>
            <dt>GSTIN</dt>
            <dd>{entity.gstin ?? '—'}</dd>
            <dt>CIN</dt>
            <dd>{entity.cin ?? '—'}</dd>
            <dt>Account manager</dt>
            <dd>{entity.accountManager?.name ?? '—'}</dd>
            <dt>Phone</dt>
            <dd>{entity.phone ?? '—'}</dd>
            <dt>Email</dt>
            <dd>{entity.email ?? '—'}</dd>
            <dt>Status</dt>
            <dd>{entity.isActive ? 'Active' : 'Inactive'}</dd>
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
            Entity name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label>
            PAN
            <input
              type="text"
              value={form.pan}
              onChange={(event) => setForm({ ...form, pan: event.target.value })}
            />
          </label>
          <label>
            GSTIN
            <input
              type="text"
              value={form.gstin}
              onChange={(event) => setForm({ ...form, gstin: event.target.value })}
            />
          </label>
          <label>
            CIN
            <input
              type="text"
              value={form.cin}
              onChange={(event) => setForm({ ...form, cin: event.target.value })}
            />
          </label>
          <label>
            Account manager
            <select
              value={form.accountManagerId}
              onChange={(event) => setForm({ ...form, accountManagerId: event.target.value })}
              aria-label="Account manager"
            >
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phone
            <input
              type="text"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
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
    </div>
  );
}
