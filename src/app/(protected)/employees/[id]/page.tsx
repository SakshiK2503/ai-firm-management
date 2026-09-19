import { notFound } from 'next/navigation';
import { db } from '@/modules/kernel/db';
import { requireUserWithPermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { getEmployee } from '@/modules/identity/employee.service';
import { listEmployeeSkills, listSkills } from '@/modules/identity/skill.service';
import { listAvailability } from '@/modules/identity/availability.service';
import { EmployeeDetail } from './EmployeeDetail';
import { EmployeeSkills } from './EmployeeSkills';
import { EmployeeAvailability } from './EmployeeAvailability';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await requireUserWithPermission('employee:view');
  if (!allowed) {
    return (
      <div>
        <h1>Employee</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const { id } = await params;
  const employee = await getEmployee(user.organisationId, id).catch(() => null);
  if (!employee) {
    notFound();
  }

  const canManage = user.roleId ? await roleHasPermission(user.roleId, 'employee:manage') : false;
  const [departments, roles, potentialManagers] = canManage
    ? await Promise.all([
        db.department.findMany({
          where: { organisationId: user.organisationId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.role.findMany({
          where: { organisationId: user.organisationId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        db.user.findMany({
          where: { organisationId: user.organisationId, isActive: true, id: { not: id } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ])
    : [[], [], []];

  const canViewSkills = user.roleId ? await roleHasPermission(user.roleId, 'skill:view') : false;
  const canManageSkills = user.roleId
    ? await roleHasPermission(user.roleId, 'skill:manage')
    : false;
  const canViewAvailability = user.roleId
    ? await roleHasPermission(user.roleId, 'availability:view')
    : false;
  const canManageAvailability = user.roleId
    ? await roleHasPermission(user.roleId, 'availability:manage')
    : false;

  const [employeeSkills, skillCatalog] = canViewSkills
    ? await Promise.all([
        listEmployeeSkills(user.organisationId, id),
        listSkills(user.organisationId),
      ])
    : [[], []];
  const availability = canViewAvailability ? await listAvailability(user.organisationId, id) : [];

  return (
    <>
      <EmployeeDetail
        employee={employee}
        canManage={canManage}
        departments={departments}
        roles={roles}
        potentialManagers={potentialManagers}
      />
      {canViewSkills && (
        <EmployeeSkills
          employeeId={id}
          initialSkills={employeeSkills}
          skillCatalog={skillCatalog}
          canManage={canManageSkills}
        />
      )}
      {canViewAvailability && (
        <EmployeeAvailability
          employeeId={id}
          initialAvailability={availability.map((record) => ({
            ...record,
            startDate: record.startDate.toISOString(),
            endDate: record.endDate.toISOString(),
          }))}
          canManage={canManageAvailability}
        />
      )}
    </>
  );
}
