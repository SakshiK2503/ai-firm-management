'use client';

import { useState, type FormEvent } from 'react';
import { extractErrorMessage } from '@/modules/kernel/api-client';
import styles from './page.module.css';

const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
type SkillLevel = (typeof SKILL_LEVELS)[number];

interface EmployeeSkill {
  id: string;
  level: SkillLevel;
  skill: { id: string; name: string };
}

interface SkillOption {
  id: string;
  name: string;
}

export function EmployeeSkills({
  employeeId,
  initialSkills,
  skillCatalog,
  canManage,
}: {
  employeeId: string;
  initialSkills: EmployeeSkill[];
  skillCatalog: SkillOption[];
  canManage: boolean;
}) {
  const [skills, setSkills] = useState(initialSkills);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const assignableSkills = skillCatalog.filter(
    (skill) => !skills.some((employeeSkill) => employeeSkill.skill.id === skill.id),
  );
  const [form, setForm] = useState({
    skillId: assignableSkills[0]?.id ?? '',
    level: 'BEGINNER' as SkillLevel,
  });

  async function refresh() {
    const response = await fetch(`/api/employees/${employeeId}/skills`);
    if (response.ok) {
      const body = await response.json();
      setSkills(body.skills);
    }
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/employees/${employeeId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(extractErrorMessage(body));
        return;
      }

      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(skillId: string) {
    const response = await fetch(`/api/employees/${employeeId}/skills/${skillId}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      await refresh();
    }
  }

  return (
    <section className={styles.section}>
      <h2>Skills</h2>

      {skills.length === 0 ? (
        <p>No skills assigned yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Skill</th>
              <th>Level</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {skills.map((employeeSkill) => (
              <tr key={employeeSkill.id}>
                <td>{employeeSkill.skill.name}</td>
                <td>{employeeSkill.level}</td>
                {canManage && (
                  <td>
                    <button type="button" onClick={() => handleRemove(employeeSkill.skill.id)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage && assignableSkills.length > 0 && (
        <form onSubmit={handleAssign} className={styles.createForm}>
          <label className={styles.field}>
            Skill
            <select
              value={form.skillId}
              onChange={(event) => setForm({ ...form, skillId: event.target.value })}
              aria-label="Skill"
            >
              {assignableSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Level
            <select
              value={form.level}
              onChange={(event) => setForm({ ...form, level: event.target.value as SkillLevel })}
              aria-label="Level"
            >
              {SKILL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
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
    </section>
  );
}
