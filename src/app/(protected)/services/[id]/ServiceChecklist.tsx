'use client';

import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

interface ChecklistItem {
  id: string;
  label: string;
  position: number;
}

interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export function ServiceChecklist({
  serviceId,
  initialChecklist,
  canManage,
}: {
  serviceId: string;
  initialChecklist: Checklist | null;
  canManage: boolean;
}) {
  const [checklist, setChecklist] = useState(initialChecklist);
  const [templateName, setTemplateName] = useState('Standard checklist');
  const [itemsText, setItemsText] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/services/${serviceId}/checklist`);
    if (response.ok) {
      const body = await response.json();
      setChecklist(body.checklist);
    }
  }

  async function handleCreateTemplate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const items = itemsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const response = await fetch(`/api/services/${serviceId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName, items }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(extractErrorMessage(body));
        return;
      }

      setItemsText('');
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddItem(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/services/${serviceId}/checklist/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newItemLabel }),
    });

    if (!response.ok) {
      const body = await response.json();
      setError(extractErrorMessage(body));
      return;
    }

    setNewItemLabel('');
    await refresh();
  }

  async function handleRemoveItem(itemId: string) {
    const response = await fetch(`/api/services/${serviceId}/checklist/items/${itemId}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      await refresh();
    }
  }

  if (!checklist) {
    if (!canManage) {
      return (
        <section>
          <h2>Checklist</h2>
          <p>No checklist template has been set up for this service.</p>
        </section>
      );
    }

    return (
      <section>
        <h2>Checklist</h2>
        <form onSubmit={handleCreateTemplate} className={styles.editForm}>
          <label className={styles.field}>
            Template name
            <input
              type="text"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              aria-label="Checklist template name"
              required
            />
          </label>
          <label className={styles.field}>
            Items (one per line)
            <textarea
              value={itemsText}
              onChange={(event) => setItemsText(event.target.value)}
              aria-label="Checklist items"
              rows={4}
              required
            />
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create checklist'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section>
      <h2>Checklist: {checklist.name}</h2>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {checklist.items.length === 0 ? (
        <p>No checklist items yet.</p>
      ) : (
        <ul className={styles.checklistItems}>
          {checklist.items.map((item) => (
            <li key={item.id}>
              {item.label}
              {canManage && (
                <button type="button" onClick={() => handleRemoveItem(item.id)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={handleAddItem} className={styles.createForm}>
          <label className={styles.field}>
            New item
            <input
              type="text"
              value={newItemLabel}
              onChange={(event) => setNewItemLabel(event.target.value)}
              aria-label="New checklist item"
              required
            />
          </label>
          <button type="submit">Add item</button>
        </form>
      )}
    </section>
  );
}
