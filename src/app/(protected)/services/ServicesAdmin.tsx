'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

interface ServiceTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  department: { id: string; name: string } | null;
  children: ServiceTreeNode[];
}

interface Department {
  id: string;
  name: string;
}

function flatten(nodes: ServiceTreeNode[], depth = 0): { node: ServiceTreeNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)]);
}

export function ServicesAdmin({
  initialTree,
  departments,
  canManage,
}: {
  initialTree: ServiceTreeNode[];
  departments: Department[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [tree, setTree] = useState(initialTree);
  const [form, setForm] = useState({
    name: '',
    parentId: '',
    departmentId: '',
    expectedSkillLevel: '',
    turnaroundDays: '',
    reviewRequired: false,
    isRecurring: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const flatRows = flatten(tree);

  async function refresh() {
    const response = await fetch('/api/services?includeInactive=true');
    if (response.ok) {
      const body = await response.json();
      setTree(body.services);
      router.refresh();
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = { name: form.name };
      if (form.parentId) payload.parentId = form.parentId;
      if (form.departmentId) payload.departmentId = form.departmentId;
      if (form.expectedSkillLevel) payload.expectedSkillLevel = form.expectedSkillLevel;
      if (form.turnaroundDays) payload.turnaroundDays = Number(form.turnaroundDays);
      payload.reviewRequired = form.reviewRequired;
      payload.isRecurring = form.isRecurring;

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(extractErrorMessage(body));
        return;
      }

      setForm({
        name: '',
        parentId: '',
        departmentId: '',
        expectedSkillLevel: '',
        turnaroundDays: '',
        reviewRequired: false,
        isRecurring: false,
      });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(service: ServiceTreeNode) {
    const response = await fetch(`/api/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    if (response.ok) {
      await refresh();
    }
  }

  return (
    <div>
      <h1>Services</h1>

      {canManage && (
        <form onSubmit={handleCreate} className={styles.createForm}>
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
            Parent category
            <select
              value={form.parentId}
              onChange={(event) => setForm({ ...form, parentId: event.target.value })}
              aria-label="Parent category"
            >
              <option value="">No parent (top-level)</option>
              {flatRows.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {depth > 0 ? `${'—'.repeat(depth)} ${node.name}` : node.name}
                </option>
              ))}
            </select>
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

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add service'}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {flatRows.length === 0 ? (
        <p>No services found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Status</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {flatRows.map(({ node, depth }) => (
              <tr key={node.id}>
                <td style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}>
                  <Link href={`/services/${node.id}`}>{node.name}</Link>
                </td>
                <td>{node.department?.name ?? '—'}</td>
                <td>{node.isActive ? 'Active' : 'Disabled'}</td>
                {canManage && (
                  <td>
                    <button type="button" onClick={() => toggleActive(node)}>
                      {node.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
