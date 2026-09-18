'use client';

import { useState, type FormEvent } from 'react';
import styles from './page.module.css';

interface Department {
  id: string;
  name: string;
  isActive: boolean;
}

export function DepartmentsAdmin({ initialDepartments }: { initialDepartments: Department[] }) {
  const [departments, setDepartments] = useState(initialDepartments);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const filtered = departments.filter((department) =>
    department.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function refresh() {
    const response = await fetch('/api/departments?includeInactive=true');
    if (response.ok) {
      const body = await response.json();
      setDepartments(body.departments);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(body.error?.message ?? 'Something went wrong.');
        return;
      }

      setNewName('');
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(department: Department) {
    const response = await fetch(`/api/departments/${department.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !department.isActive }),
    });
    if (response.ok) {
      await refresh();
    }
  }

  return (
    <div>
      <h1>Departments</h1>

      <form onSubmit={handleCreate} className={styles.createForm}>
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New department name"
          aria-label="New department name"
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add department'}
        </button>
      </form>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search departments"
        aria-label="Search departments"
        className={styles.search}
      />

      {filtered.length === 0 ? (
        <p>No departments found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((department) => (
              <tr key={department.id}>
                <td>{department.name}</td>
                <td>{department.isActive ? 'Active' : 'Disabled'}</td>
                <td>
                  <button type="button" onClick={() => toggleActive(department)}>
                    {department.isActive ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
