# RBAC design — Day 14

Defines the role-permission matrix. Drafted, reviewed by the founder, and revised per that
review (2026-09-18) — see **Founder review** at the bottom for what changed and why.

Enforcement (actually checking these in API routes) is Day 15's job. Today defines the model:
the permission catalog, the role-permission grants, and a DB-backed lookup function.

## Roles are data, permissions are the enforcement unit

Three fixed roles exist: **Partner**, **Manager**, **Preparer** (seeded in `prisma/seed-
data.ts`). No role-builder UI — nothing in the roadmap calls for one, and per CLAUDE.md's
"build incrementally" principle, that would be premature.

But _which permissions a role has_ is modeled as data, not code:

- `Permission` — the fixed catalog of permission keys (`src/modules/kernel/rbac/
permissions.ts`). Fixed because a new permission key needs new enforcement code to actually
  check it — adding a row here alone does nothing.
- `RolePermission` — a join table (`roleId`, `permissionKey`) that says which permissions a
  role actually has. This is data, seeded by `prisma/rbac-seed-data.ts`.
- Enforcement code (Day 15) always checks `roleHasPermission(roleId, 'task:reassign')` —
  **never** `if (role.name === 'Manager')`.

The payoff: adding a fourth role later (say, a firm-specific "Senior Associate") is a new `Role`
row plus a new set of `RolePermission` grants — zero enforcement code touched. The expensive
version, which this avoids, is the role name scattered through dozens of `if` statements across
the codebase.

## Deviation from a fuller PRD role hierarchy — a conscious simplification

If a fuller PRD describes five internal roles (Super Admin, Management/Partner, Department
Head, Manager/Reviewer, Employee), this design collapses that to three: **Partner absorbs Super
Admin and Department Head**. That means Partner is currently both the operational leadership
role _and_ the system-configuration account (organisation settings, departments, employees,
service catalogue). This is a reasonable simplification for a smaller firm, made consciously
here rather than discovered later — flagging it so it isn't mistaken for an oversight. Splitting
Partner into separate "Super Admin" and "Department Head" roles later is exactly the kind of
change the data-driven model above makes cheap: new roles, new grants, no code changes.

## Permission catalog

Permissions are `resource:action` strings. Resources below are either already in the schema
(Department/Employee) or belong to modules the roadmap has committed to building (Task Engine,
Client Management, Time & Economics, Deadlines & SLA, Allocation Engine, Audit & Security).
Where a resource doesn't have a table yet, the permission exists as a placeholder those future
days will consume.

| Resource       | Actions                                                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organisation` | `manage`                                                                                                                                                                                                                   |
| `department`   | `view`, `manage`                                                                                                                                                                                                           |
| `employee`     | `view`, `manage`                                                                                                                                                                                                           |
| `client`       | `view` (own/assigned), `viewAll` (firm-wide), `editContact` (lightweight fields), `editStructural` (billing/PAN/GSTIN/termination)                                                                                         |
| `service`      | `view`, `manage`                                                                                                                                                                                                           |
| `task`         | `view`, `viewAll`, `create`, `updateStatus`, `reassign`, `review`, `cancel`                                                                                                                                                |
| `document`     | `view`, `upload`, `delete`                                                                                                                                                                                                 |
| `timeEntry`    | `viewOwn`, `viewAll`, `log`, `approve`                                                                                                                                                                                     |
| `deadline`     | `view`, `manage`                                                                                                                                                                                                           |
| `allocation`   | `override`                                                                                                                                                                                                                 |
| `auditLog`     | `view` — **there is no `auditLog:manage`, for anyone.** The audit trail must stay immutable per CLAUDE.md's "complete audit trail" principle; nobody, not even Partner, gets a permission to edit or delete audit entries. |
| `dashboard`    | `view`                                                                                                                                                                                                                     |

Two deliberate non-permissions, both from founder review:

- **No `task:delete`.** The task status machine already has a `Cancelled` state for exactly
  this case — "no material action should disappear" (CLAUDE.md principle 5). `task:cancel` is
  the soft, auditable equivalent; nobody gets a hard delete.
- **`client:manage` doesn't exist** as a single permission — split into `editContact`
  (day-to-day fields: contact notes, service assignment) and `editStructural` (billing
  structure, PAN/GSTIN, terminating an engagement), because those carry very different risk and
  shouldn't be gated the same way.

`document:delete` is kept as a real delete for now (unlike task) since Documents & Knowledge
(Day 73+) hasn't defined its archive/retention policy yet — worth revisiting against the same
"nothing disappears" principle once that day actually designs it, rather than guessing here.

## The matrix

Hierarchical: **Partner ⊇ Manager ⊇ Preparer**. Enforced structurally in
`prisma/rbac-seed-data.ts` — Manager's grant list literally starts with Preparer's, Partner's
literally starts with Manager's — so it can't silently drift apart, and tested in
`prisma/rbac-seed-data.test.ts`.

| Permission                    | Preparer | Manager | Partner |
| ----------------------------- | -------- | ------- | ------- |
| `task:view`                   | ✅       | ✅      | ✅      |
| `task:updateStatus`           | ✅       | ✅      | ✅      |
| `document:view`               | ✅       | ✅      | ✅      |
| `document:upload`             | ✅       | ✅      | ✅      |
| `timeEntry:viewOwn`           | ✅       | ✅      | ✅      |
| `timeEntry:log`               | ✅       | ✅      | ✅      |
| `deadline:view`               | ✅       | ✅      | ✅      |
| `client:view` (assigned only) | ✅       | ✅      | ✅      |
| `dashboard:view`              | ✅       | ✅      | ✅      |
| `task:viewAll`                |          | ✅      | ✅      |
| `task:create`                 |          | ✅      | ✅      |
| `task:reassign`               |          | ✅      | ✅      |
| `task:review`                 |          | ✅      | ✅      |
| `task:cancel`                 |          | ✅      | ✅      |
| `document:delete`             |          | ✅      | ✅      |
| `timeEntry:viewAll`           |          | ✅      | ✅      |
| `timeEntry:approve`           |          | ✅      | ✅      |
| `deadline:manage`             |          | ✅      | ✅      |
| `client:viewAll`              |          | ✅      | ✅      |
| `client:editContact`          |          | ✅      | ✅      |
| `service:view`                |          | ✅      | ✅      |
| `employee:view`               |          | ✅      | ✅      |
| `allocation:override`         |          | ✅      | ✅      |
| `organisation:manage`         |          |         | ✅      |
| `department:view`             |          |         | ✅      |
| `department:manage`           |          |         | ✅      |
| `employee:manage`             |          |         | ✅      |
| `service:manage`              |          |         | ✅      |
| `client:editStructural`       |          |         | ✅      |
| `auditLog:view`               |          |         | ✅      |

## Known gaps: row-level scoping isn't real yet

Two separate scoping problems this design names but does not solve, because the underlying
tables don't exist yet:

1. **Client scoping.** A Preparer's `client:view` should mean "clients tied to tasks currently
   or previously assigned to me," not "every client in the firm" — per the explicit "employees
   should not have unrestricted access to all client information" requirement. There's no
   `Client` or `Task` table yet (Client Management is Day 28+, Task Engine is Day 44+), so this
   can't be enforced today; it's a query-level filter those days need to build, not just a
   boolean permission check.
2. **Department scoping.** A Manager's `viewAll`/`reassign` etc. are firm-wide here, same as
   Partner, because nothing attaches a department to a Task in an enforceable way yet, and
   there's no "manager of department X" concept beyond a User having one `departmentId`. Also a
   Day 44+ problem.

Both are noted here so Day 15's enforcement code (and whichever days build Client/Task) know
these exist, without pretending to solve them before the tables they depend on exist.

## Where this lives in code

- `src/modules/kernel/rbac/permissions.ts` — the `Permission` catalog (with descriptions used
  when seeding), `SystemRole` type, and `roleHasPermission(roleId, permission)` — an async DB
  query, not a hardcoded lookup.
- `prisma/rbac-seed-data.ts` — the actual role → permission grants (the one hardcoded mapping in
  the system) and the seed logic that writes them into `RolePermission`.
- Kernel owns the permission-check function per `docs/ARCHITECTURE.md`. Wiring
  `roleHasPermission` into actual route/page enforcement (throwing 403s, gating UI) is Day 15.

## Founder review (2026-09-18)

What changed from the first draft, and why:

1. **Permission-based enforcement, roles as data** — see above. Was: a hardcoded
   `Record<SystemRole, Set<Permission>>` in code. Reason: makes adding a role later a data
   change instead of an enforcement-code change.
2. **PRD's fuller role hierarchy collapsing to 3, with Partner absorbing Super Admin + Department
   Head** — named explicitly as a conscious simplification rather than left implicit.
3. **Client visibility scoped to assigned clients, not firm-wide, for Preparer** — matches an
   explicit requirement that employees shouldn't see all client data. Documented as a known gap
   (no Client/Task table yet to scope by).
4. **`task:delete` removed, replaced with `task:cancel`** — no material action should disappear;
   the task status machine already has `Cancelled` for this.
5. **`client:manage` split into `editContact` (Manager+) and `editStructural` (Partner-only)** —
   day-to-day contact/service-assignment edits vs. structural billing/compliance fields carry
   different risk and shouldn't share one permission.
6. **`auditLog:view` made explicitly the only audit permission that will ever exist** — no
   `auditLog:manage`, for anyone, ever. Called out explicitly rather than left as an absence
   someone might "fix" later.
