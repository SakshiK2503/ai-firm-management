'use client';

import Link from 'next/link';
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

export function EmployeesAdmin({
  initialEmployees,
  canManage,
  departments,
  roles,
  potentialManagers,
}: {
  initialEmployees: Employee[];
  canManage: boolean;
  departments: Option[];
  roles: Option[];
  potentialManagers: Option[];
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [managerOptions, setManagerOptions] = useState(potentialManagers);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    departmentId: departments[0]?.id ?? '',
    roleId: roles[0]?.id ?? '',
    managerId: '',
  });

  async function refresh(nextIncludeInactive: boolean, nextSearch: string) {
    const params = new URLSearchParams();
    if (nextSearch) params.set('search', nextSearch);
    if (nextIncludeInactive) params.set('includeInactive', 'true');

    const response = await fetch(`/api/employees?${params.toString()}`);
    if (response.ok) {
      const body = await response.json();
      setEmployees(body.employees);
    }
  }

  async function handleSearchChange(value: string) {
    setSearch(value);
    await refresh(includeInactive, value);
  }

  async function handleIncludeInactiveChange(value: boolean) {
    setIncludeInactive(value);
    await refresh(value, search);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { managerId, ...rest } = form;
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(managerId ? { ...rest, managerId } : rest),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      // The manager dropdown's options come from the server-rendered page load, so a newly
      // created employee wouldn't otherwise be selectable as a manager until a full reload.
      setManagerOptions((current) =>
        [...current, { id: body.employee.id, name: body.employee.name }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );

      setForm({
        name: '',
        email: '',
        password: '',
        departmentId: departments[0]?.id ?? '',
        roleId: roles[0]?.id ?? '',
        managerId: '',
      });
      await refresh(includeInactive, search);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Employees</h1>

      {canManage && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Full name"
            aria-label="Full name"
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="Email"
            aria-label="Email"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Temporary password"
            aria-label="Temporary password"
            required
          />
          <select
            value={form.departmentId}
            onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
            aria-label="Department"
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            value={form.roleId}
            onChange={(event) => setForm({ ...form, roleId: event.target.value })}
            aria-label="Role"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            value={form.managerId}
            onChange={(event) => setForm({ ...form, managerId: event.target.value })}
            aria-label="Manager"
          >
            <option value="">No manager</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add employee'}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.filters}>
        <input
          type="search"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search employees"
          aria-label="Search employees"
          className={styles.search}
        />
        <label>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => handleIncludeInactiveChange(event.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {employees.length === 0 ? (
        <p>No employees found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <Link href={`/employees/${employee.id}`}>{employee.name}</Link>
                </td>
                <td>{employee.email}</td>
                <td>{employee.department?.name ?? '—'}</td>
                <td>{employee.role?.name ?? '—'}</td>
                <td>{employee.manager?.name ?? '—'}</td>
                <td>{employee.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
