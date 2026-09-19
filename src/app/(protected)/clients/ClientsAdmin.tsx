'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

interface Client {
  id: string;
  name: string;
  isActive: boolean;
}

interface ListResult {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
}

export function ClientsAdmin({
  initialResult,
  canManage,
  canViewAny,
}: {
  initialResult: ListResult;
  canManage: boolean;
  canViewAny: boolean;
}) {
  const [result, setResult] = useState(initialResult);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  async function refresh(nextIncludeInactive: boolean, nextSearch: string, page = 1) {
    const params = new URLSearchParams();
    if (nextSearch) params.set('search', nextSearch);
    if (nextIncludeInactive) params.set('includeInactive', 'true');
    params.set('page', String(page));

    const response = await fetch(`/api/clients?${params.toString()}`);
    if (response.ok) {
      setResult(await response.json());
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
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      setNewName('');
      await refresh(includeInactive, search, 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Clients</h1>

      {canManage && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New client/group name"
            aria-label="New client name"
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add client'}
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
          placeholder="Search clients"
          aria-label="Search clients"
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

      {result.clients.length === 0 ? (
        <p>{canViewAny ? 'No clients found.' : 'No clients are currently assigned to you.'}</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link href={`/clients/${client.id}`}>{client.name}</Link>
                  </td>
                  <td>{client.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                onClick={() => refresh(includeInactive, search, result.page - 1)}
                disabled={result.page <= 1}
              >
                Previous
              </button>
              <span>
                Page {result.page} of {totalPages} ({result.total} total)
              </span>
              <button
                type="button"
                onClick={() => refresh(includeInactive, search, result.page + 1)}
                disabled={result.page >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
