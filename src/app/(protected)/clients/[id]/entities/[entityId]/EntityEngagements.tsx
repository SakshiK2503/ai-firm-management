'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from '../../page.module.css';

const BILLING_STRUCTURES = ['MONTHLY', 'ASSIGNMENT'] as const;

const BILLING_LABELS: Record<(typeof BILLING_STRUCTURES)[number], string> = {
  MONTHLY: 'Monthly',
  ASSIGNMENT: 'Assignment',
};

interface Engagement {
  id: string;
  engagementStart: string;
  billingStructure: (typeof BILLING_STRUCTURES)[number];
  isActive: boolean;
  service: { id: string; name: string; isActive: boolean };
}

interface ServiceTreeNode {
  id: string;
  name: string;
  children: ServiceTreeNode[];
}

function flattenServices(
  nodes: ServiceTreeNode[],
  depth = 0,
): { node: ServiceTreeNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flattenServices(node.children, depth + 1)]);
}

export function EntityEngagements({
  clientId,
  entityId,
  initialEngagements,
  serviceTree,
  canManage,
}: {
  clientId: string;
  entityId: string;
  initialEngagements: Engagement[];
  serviceTree: ServiceTreeNode[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [engagements, setEngagements] = useState(initialEngagements);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    serviceId: '',
    engagementStart: new Date().toISOString().slice(0, 10),
    billingStructure: 'MONTHLY' as (typeof BILLING_STRUCTURES)[number],
  });

  const flatServices = flattenServices(serviceTree);
  const engagementsUrl = `/api/clients/${clientId}/entities/${entityId}/engagements`;

  async function refresh() {
    const response = await fetch(engagementsUrl);
    if (response.ok) {
      const body = await response.json();
      setEngagements(body.engagements);
    }
    router.refresh();
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(engagementsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      setForm({
        serviceId: '',
        engagementStart: new Date().toISOString().slice(0, 10),
        billingStructure: 'MONTHLY',
      });
      setShowForm(false);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(engagement: Engagement) {
    const response = await fetch(`${engagementsUrl}/${engagement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !engagement.isActive }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(extractErrorMessage(body));
      return;
    }
    await refresh();
  }

  return (
    <section className={styles.section}>
      <h2>Engagements</h2>

      {engagements.length === 0 ? (
        <p>No services engaged yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Service</th>
              <th>Start</th>
              <th>Billing</th>
              <th>Status</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {engagements.map((engagement) => (
              <tr key={engagement.id}>
                <td>{engagement.service.name}</td>
                <td>{new Date(engagement.engagementStart).toLocaleDateString()}</td>
                <td>{BILLING_LABELS[engagement.billingStructure]}</td>
                <td>{engagement.isActive ? 'Active' : 'Terminated'}</td>
                {canManage && (
                  <td>
                    <button type="button" onClick={() => toggleActive(engagement)}>
                      {engagement.isActive ? 'Terminate' : 'Reactivate'}
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
          Add engagement
        </button>
      )}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className={styles.editForm}>
          <label>
            Service
            <select
              value={form.serviceId}
              onChange={(event) => setForm({ ...form, serviceId: event.target.value })}
              aria-label="Service"
              required
            >
              <option value="">Select a service</option>
              {flatServices.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {depth > 0 ? `${'—'.repeat(depth)} ${node.name}` : node.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Engagement start
            <input
              type="date"
              value={form.engagementStart}
              onChange={(event) => setForm({ ...form, engagementStart: event.target.value })}
              aria-label="Engagement start"
              required
            />
          </label>
          <label>
            Billing structure
            <select
              value={form.billingStructure}
              onChange={(event) =>
                setForm({
                  ...form,
                  billingStructure: event.target.value as (typeof BILLING_STRUCTURES)[number],
                })
              }
              aria-label="Billing structure"
            >
              {BILLING_STRUCTURES.map((structure) => (
                <option key={structure} value={structure}>
                  {BILLING_LABELS[structure]}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add engagement'}
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
