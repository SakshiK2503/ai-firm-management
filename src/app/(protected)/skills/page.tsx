import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { listSkills } from '@/modules/identity/skill.service';
import { SkillsAdmin } from './SkillsAdmin';

export default async function SkillsPage() {
  const { user, allowed } = await requireUserWithPermission('skill:view');
  if (!allowed) {
    return (
      <div>
        <h1>Skills</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const canManage = user.roleId ? await roleHasPermission(user.roleId, 'skill:manage') : false;
  const skills = await listSkills(user.organisationId, { includeInactive: true });

  return <SkillsAdmin initialSkills={skills} canManage={canManage} />;
}
