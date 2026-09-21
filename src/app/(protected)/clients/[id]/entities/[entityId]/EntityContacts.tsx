'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from '../../page.module.css';

interface Contact {
  id: string;
  name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

export function EntityContacts({
  clientId,
  entityId,
  initialContacts,
  canManage,
}: {
  clientId: string;
  entityId: string;
  initialContacts: Contact[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    isPrimary: false,
  });

  const contactsUrl = `/api/clients/${clientId}/entities/${entityId}/contacts`;

  async function refresh() {
    const response = await fetch(contactsUrl);
    if (response.ok) {
      const body = await response.json();
      setContacts(body.contacts);
    }
    // The entity's own "Primary contact" field (EntityDetail, a sibling component) is computed
    // server-side from this same data - refreshing only this component's local state would
    // leave that field stale after a create/remove/primary change, so re-run the server
    // components too.
    router.refresh();
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name: form.name,
        isPrimary: form.isPrimary,
        ...(form.designation ? { designation: form.designation } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.email ? { email: form.email } : {}),
      };
      const response = await fetch(contactsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      setForm({ name: '', designation: '', phone: '', email: '', isPrimary: false });
      setShowForm(false);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(contactId: string) {
    const response = await fetch(`${contactsUrl}/${contactId}`, { method: 'DELETE' });
    if (response.ok) {
      await refresh();
    }
  }

  return (
    <section className={styles.section}>
      <h2>Contacts</h2>

      {contacts.length === 0 ? (
        <p>No contacts added yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Primary</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td>{contact.name}</td>
                <td>{contact.designation ?? '—'}</td>
                <td>{contact.phone ?? '—'}</td>
                <td>{contact.email ?? '—'}</td>
                <td>{contact.isPrimary ? 'Yes' : '—'}</td>
                {canManage && (
                  <td>
                    <button type="button" onClick={() => handleRemove(contact.id)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage && !showForm && (
        <button type="button" onClick={() => setShowForm(true)}>
          Add contact
        </button>
      )}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className={styles.editForm}>
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
            Designation
            <input
              type="text"
              value={form.designation}
              onChange={(event) => setForm({ ...form, designation: event.target.value })}
              placeholder="Optional"
            />
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
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(event) => setForm({ ...form, isPrimary: event.target.checked })}
            />
            Primary contact
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add contact'}
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
