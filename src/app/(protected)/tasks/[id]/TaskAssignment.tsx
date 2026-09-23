'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

interface EligibleEmployee {
  id: string;
  name: string;
  department: { id: string; name: string } | null;
}

export function TaskAssignment({
  taskId,
  status,
  assignedTo,
  canReassign,
}: {
  taskId: string;
  status: string;
  assignedTo: { id: string; name: string } | null;
  canReassign: boolean;
}) {
  const router = useRouter();
  const [eligible, setEligible] = useState<EligibleEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const canAssignNow = canReassign && !assignedTo && status === 'AWAITING_ALLOCATION';

  useEffect(() => {
    if (!canAssignNow) return;
    fetch(`/api/tasks/${taskId}/eligible-employees`)
      .then((response) => (response.ok ? response.json() : { employees: [] }))
      .then((body) => setEligible(body.employees));
  }, [canAssignNow, taskId]);

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(extractErrorMessage(body));
        return;
      }

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!canAssignNow) {
    return <p>Assigned to: {assignedTo ? assignedTo.name : 'Unassigned'}</p>;
  }

  return (
    <div>
      <p>Assigned to: Unassigned</p>
      {eligible.length === 0 ? (
        <p>No eligible active employees found for this task&apos;s department.</p>
      ) : (
        <form onSubmit={handleAssign} className={styles.assignForm}>
          <label className={styles.field}>
            Employee
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              aria-label="Assign to employee"
              required
            >
              <option value="">Select an employee</option>
              {eligible.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Assigning…' : 'Assign'}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
