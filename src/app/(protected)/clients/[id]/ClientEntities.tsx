'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

interface Entity {
  id: string;
  name: string;
  pan: string | null;
  gstin: string | null;
  isActive: boolean;
  accountManager: { id: string; name: string } | null;
}

interface EmployeeOption {
  id: string;
  name: string;
}

export function ClientEntities({
  clientId,
  initialEntities,
  employees,
  canManage,
}: {
  clientId: string;
  initialEntities: Entity[];
  employees: EmployeeOption[];
  canManage: boolean;
}) {
  const [entities, setEntities] = useState(initialEntities);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    pan: '',
    gstin: '',
    cin: '',
    accountManagerId: '',
    phone: '',
    email: '',
  });

  async function refresh() {
    const response = await fetch(`/api/clients/${clientId}/entities`);
    if (response.ok) {
      const body = await response.json();
      setEntities(body.entities);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
      const response = await fetch(`/api/clients/${clientId}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      setForm({
        name: '',
        pan: '',
        gstin: '',
        cin: '',
        accountManagerId: '',
        phone: '',
        email: '',
      });
      setShowForm(false);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.section}>
      <h2>Legal entities</h2>

      {entities.length === 0 ? (
        <p>No legal entities added yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>PAN</th>
              <th>GSTIN</th>
              <th>Account manager</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((entity) => (
              <tr key={entity.id}>
                <td>
                  <Link href={`/clients/${clientId}/entities/${entity.id}`}>{entity.name}</Link>
                </td>
                <td>{entity.pan ?? '—'}</td>
                <td>{entity.gstin ?? '—'}</td>
                <td>{entity.accountManager?.name ?? '—'}</td>
                <td>{entity.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage && !showForm && (
        <button type="button" onClick={() => setShowForm(true)}>
          Add legal entity
        </button>
      )}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className={styles.editForm}>
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
              placeholder="Optional"
            />
          </label>
          <label>
            GSTIN
            <input
              type="text"
              value={form.gstin}
              onChange={(event) => setForm({ ...form, gstin: event.target.value })}
              placeholder="Optional"
            />
          </label>
          <label>
            CIN
            <input
              type="text"
              value={form.cin}
              onChange={(event) => setForm({ ...form, cin: event.target.value })}
              placeholder="Optional"
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
              placeholder="Optional"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Optional"
            />
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add entity'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
