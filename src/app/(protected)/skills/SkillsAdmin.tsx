'use client';

import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

interface Skill {
  id: string;
  name: string;
  isActive: boolean;
  employeeCount: number;
}

export function SkillsAdmin({
  initialSkills,
  canManage,
}: {
  initialSkills: Skill[];
  canManage: boolean;
}) {
  const [skills, setSkills] = useState(initialSkills);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const filtered = skills.filter((skill) =>
    skill.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function refresh() {
    const response = await fetch('/api/skills?includeInactive=true');
    if (response.ok) {
      const body = await response.json();
      setSkills(body.skills);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(extractErrorMessage(body));
        return;
      }

      setNewName('');
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(skill: Skill) {
    const response = await fetch(`/api/skills/${skill.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !skill.isActive }),
    });
    if (response.ok) {
      await refresh();
    }
  }

  return (
    <div>
      <h1>Skills</h1>

      {canManage && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New skill name"
            aria-label="New skill name"
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add skill'}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search skills"
        aria-label="Search skills"
        className={styles.search}
      />

      {filtered.length === 0 ? (
        <p>No skills found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Employees</th>
              <th>Status</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((skill) => (
              <tr key={skill.id}>
                <td>{skill.name}</td>
                <td>{skill.employeeCount}</td>
                <td>{skill.isActive ? 'Active' : 'Disabled'}</td>
                {canManage && (
                  <td>
                    <button type="button" onClick={() => toggleActive(skill)}>
                      {skill.isActive ? 'Disable' : 'Enable'}
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
