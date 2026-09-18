'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

interface Employee {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  department: { id: string; name: string } | null;
  role: { id: string; name: string } | null;
  manager: { id: string; name: string } | null;
}

interface Option {
  id: string;
  name: string;
}

export function EmployeeDetail({
  employee,
  canManage,
  departments,
  roles,
  potentialManagers,
}: {
  employee: Employee;
  canManage: boolean;
  departments: Option[];
  roles: Option[];
  potentialManagers: Option[];
}) {
  const router = useRouter();
  const [isEditing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: employee.name,
    departmentId: employee.department?.id ?? '',
    roleId: employee.role?.id ?? '',
    isActive: employee.isActive,
    managerId: employee.manager?.id ?? '',
  });

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, managerId: form.managerId || null }),
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
      <h1>{employee.name}</h1>

      {!isEditing ? (
        <>
          <dl className={styles.detailList}>
            <dt>Email</dt>
            <dd>{employee.email}</dd>
            <dt>Department</dt>
            <dd>{employee.department?.name ?? '—'}</dd>
            <dt>Role</dt>
            <dd>{employee.role?.name ?? '—'}</dd>
            <dt>Status</dt>
            <dd>{employee.isActive ? 'Active' : 'Inactive'}</dd>
            <dt>Manager</dt>
            <dd>
              {employee.manager ? (
                <Link href={`/employees/${employee.manager.id}`}>{employee.manager.name}</Link>
              ) : (
                '—'
              )}
            </dd>
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
          <label>
            Department
            <select
              value={form.departmentId}
              onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Role
            <select
              value={form.roleId}
              onChange={(event) => setForm({ ...form, roleId: event.target.value })}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Manager
            <select
              value={form.managerId}
              onChange={(event) => setForm({ ...form, managerId: event.target.value })}
              aria-label="Manager"
            >
              <option value="">No manager</option>
              {potentialManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
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
