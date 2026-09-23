'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;
const STATUSES = [
  'NEW',
  'AI_PROCESSING',
  'AWAITING_ALLOCATION',
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_CLIENT_INFO',
  'AWAITING_INTERNAL_DEPENDENCY',
  'SUBMITTED_FOR_REVIEW',
  'REVIEW_IN_PROGRESS',
  'CORRECTION_REQUIRED',
  'APPROVED',
  'CLIENT_DELIVERY',
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED',
] as const;

interface Task {
  id: string;
  taskNumber: string;
  title: string;
  priority: (typeof PRIORITIES)[number];
  status: string;
  client: { id: string; name: string };
  clientEntity: { id: string; name: string };
  service: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  name: string;
}

interface Entity {
  id: string;
  name: string;
}

interface Engagement {
  id: string;
  serviceId: string;
  isActive: boolean;
  service: { id: string; name: string };
}

export function TasksAdmin({
  initialTasks,
  clients,
  employees,
  canCreate,
  canFilter,
}: {
  initialTasks: Task[];
  clients: Client[];
  employees: EmployeeOption[];
  canCreate: boolean;
  canFilter: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [form, setForm] = useState({
    clientId: '',
    clientEntityId: '',
    serviceId: '',
    title: '',
    priority: 'NORMAL' as (typeof PRIORITIES)[number],
  });
  const [filters, setFilters] = useState({
    status: '',
    clientId: '',
    priority: '',
    assignedToId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!form.clientId) return;
    fetch(`/api/clients/${form.clientId}/entities`)
      .then((response) => (response.ok ? response.json() : { entities: [] }))
      .then((body) => setEntities(body.entities));
  }, [form.clientId]);

  useEffect(() => {
    if (!form.clientId || !form.clientEntityId) return;
    fetch(`/api/clients/${form.clientId}/entities/${form.clientEntityId}/engagements`)
      .then((response) => (response.ok ? response.json() : { engagements: [] }))
      .then((body) => setEngagements(body.engagements.filter((e: Engagement) => e.isActive)));
  }, [form.clientId, form.clientEntityId]);

  function buildTasksUrl(currentFilters: typeof filters) {
    const params = new URLSearchParams();
    if (currentFilters.status) params.set('status', currentFilters.status);
    if (currentFilters.clientId) params.set('clientId', currentFilters.clientId);
    if (currentFilters.priority) params.set('priority', currentFilters.priority);
    if (currentFilters.assignedToId) params.set('assignedToId', currentFilters.assignedToId);
    const query = params.toString();
    return query ? `/api/tasks?${query}` : '/api/tasks';
  }

  async function refresh(currentFilters: typeof filters = filters) {
    const response = await fetch(buildTasksUrl(currentFilters));
    if (response.ok) {
      const body = await response.json();
      setTasks(body.tasks);
      router.refresh();
    }
  }

  async function handleFilterChange(next: typeof filters) {
    setFilters(next);
    await refresh(next);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      setForm({ clientId: '', clientEntityId: '', serviceId: '', title: '', priority: 'NORMAL' });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Tasks</h1>

      {canFilter && (
        <div className={styles.filterBar}>
          <label className={styles.field}>
            Status
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange({ ...filters, status: event.target.value })}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Client
            <select
              value={filters.clientId}
              onChange={(event) => handleFilterChange({ ...filters, clientId: event.target.value })}
              aria-label="Filter by client"
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Priority
            <select
              value={filters.priority}
              onChange={(event) => handleFilterChange({ ...filters, priority: event.target.value })}
              aria-label="Filter by priority"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Assignee
            <select
              value={filters.assignedToId}
              onChange={(event) =>
                handleFilterChange({ ...filters, assignedToId: event.target.value })
              }
              aria-label="Filter by assignee"
            >
              <option value="">All assignees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          {(filters.status || filters.clientId || filters.priority || filters.assignedToId) && (
            <button
              type="button"
              onClick={() =>
                handleFilterChange({ status: '', clientId: '', priority: '', assignedToId: '' })
              }
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {canCreate && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <label className={styles.field}>
            Client
            <select
              value={form.clientId}
              onChange={(event) => {
                setForm({
                  ...form,
                  clientId: event.target.value,
                  clientEntityId: '',
                  serviceId: '',
                });
                setEntities([]);
                setEngagements([]);
              }}
              aria-label="Client"
              required
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Entity
            <select
              value={form.clientEntityId}
              onChange={(event) => {
                setForm({ ...form, clientEntityId: event.target.value, serviceId: '' });
                setEngagements([]);
              }}
              aria-label="Entity"
              required
              disabled={!form.clientId}
            >
              <option value="">Select an entity</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Service
            <select
              value={form.serviceId}
              onChange={(event) => setForm({ ...form, serviceId: event.target.value })}
              aria-label="Task service"
              required
              disabled={!form.clientEntityId}
            >
              <option value="">Select a service</option>
              {engagements.map((engagement) => (
                <option key={engagement.serviceId} value={engagement.serviceId}>
                  {engagement.service.name}
                </option>
              ))}
            </select>
            {form.clientEntityId && engagements.length === 0 && (
              <span className={styles.hint}>
                This entity has no active engagement yet - add one from its detail page first.
              </span>
            )}
          </label>

          <label className={styles.field}>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              aria-label="Task title"
              required
            />
          </label>

          <label className={styles.field}>
            Priority
            <select
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as (typeof PRIORITIES)[number] })
              }
              aria-label="Task priority"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create task'}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Task</th>
              <th>Title</th>
              <th>Client</th>
              <th>Entity</th>
              <th>Service</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <Link href={`/tasks/${task.id}`}>{task.taskNumber}</Link>
                </td>
                <td>{task.title}</td>
                <td>{task.client.name}</td>
                <td>{task.clientEntity.name}</td>
                <td>{task.service.name}</td>
                <td>{task.priority}</td>
                <td>{task.status}</td>
                <td>{task.assignedTo?.name ?? 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
