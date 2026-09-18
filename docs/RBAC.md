# RBAC design — Day 14

Defines the role-permission matrix. **This is a first draft for the founder to review and
correct** — the roadmap's own acceptance check for this day is "matrix reviewed against product
roles," so treat the specific grants below as a proposal, not a locked-in decision. Everything
else here (the permission taxonomy, the hierarchy pattern, where this lives in code) is a build
decision already made.

Enforcement (actually checking these in API routes) is Day 15's job. Today only defines the
matrix and a pure lookup function.

## Roles: a fixed set, not a custom-role builder

The seed data (`prisma/seed-data.ts`) already has three roles: **Partner**, **Manager**,
**Preparer** — the standard hierarchy at a professional services firm. This design assumes
those three are the _only_ roles that exist, hardcoded in code (`src/modules/kernel/rbac/
permissions.ts`), rather than building a flexible "create custom roles with custom permissions"
admin UI. Nothing in the 167-day roadmap calls for a role/permission editor, and a fixed
three-role hierarchy is simpler to reason about and audit.

**Founder: if you want org-configurable custom roles later (e.g., a firm-specific "Senior
Associate" tier), say so now — retrofitting a hardcoded enum into a flexible permission system
is more expensive than building it that way from the start.**

The `Role` database table (Day 5) still exists and is still how a `User` is linked to a role
name — this design just assumes `Role.name` will always be one of `Partner` / `Manager` /
`Preparer` for now. Day 15's enforcement code will need to decide what happens if it ever isn't
(this doc doesn't resolve that).

## Permission taxonomy

Permissions are `resource:action` strings. Resources below are either already in the schema
(Client, Document, etc. don't exist as tables yet — Employee/Department do) or are the modules
the roadmap has already committed to building (Task Engine, Time & Economics, Deadlines &
SLA, Allocation Engine, Audit & Security). Where a resource doesn't have a table yet, the
permission exists here as a placeholder those future days will consume.

| Resource       | Actions                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| `organisation` | `manage`                                                                    |
| `department`   | `view`, `manage`                                                            |
| `employee`     | `view`, `manage`                                                            |
| `client`       | `view`, `manage`                                                            |
| `service`      | `view`, `manage`                                                            |
| `task`         | `view`, `viewAll`, `create`, `updateStatus`, `reassign`, `review`, `delete` |
| `document`     | `view`, `upload`, `delete`                                                  |
| `timeEntry`    | `viewOwn`, `viewAll`, `log`, `approve`                                      |
| `deadline`     | `view`, `manage`                                                            |
| `allocation`   | `override`                                                                  |
| `auditLog`     | `view`                                                                      |
| `dashboard`    | `view`                                                                      |

`task:view` / `timeEntry:viewOwn` mean "the records assigned to or logged by me." `task:viewAll`
/ `timeEntry:viewAll` mean firm-wide (today) or department-wide (once department-level data
scoping exists — see **Known gap** below).

## The matrix

Roles are hierarchical: **Partner ⊇ Manager ⊇ Preparer** — everything a Preparer can do, a
Manager can also do, and everything a Manager can do, a Partner can also do. This isn't just a
design note, it's how `ROLE_PERMISSIONS` is actually constructed in code (each role's set
literally starts from the one below it), so it can't silently drift apart.

| Permission            | Preparer | Manager | Partner |
| --------------------- | -------- | ------- | ------- |
| `task:view`           | ✅       | ✅      | ✅      |
| `task:updateStatus`   | ✅       | ✅      | ✅      |
| `document:view`       | ✅       | ✅      | ✅      |
| `document:upload`     | ✅       | ✅      | ✅      |
| `timeEntry:viewOwn`   | ✅       | ✅      | ✅      |
| `timeEntry:log`       | ✅       | ✅      | ✅      |
| `deadline:view`       | ✅       | ✅      | ✅      |
| `client:view`         | ✅       | ✅      | ✅      |
| `dashboard:view`      | ✅       | ✅      | ✅      |
| `task:viewAll`        |          | ✅      | ✅      |
| `task:create`         |          | ✅      | ✅      |
| `task:reassign`       |          | ✅      | ✅      |
| `task:review`         |          | ✅      | ✅      |
| `task:delete`         |          | ✅      | ✅      |
| `document:delete`     |          | ✅      | ✅      |
| `timeEntry:viewAll`   |          | ✅      | ✅      |
| `timeEntry:approve`   |          | ✅      | ✅      |
| `deadline:manage`     |          | ✅      | ✅      |
| `client:manage`       |          | ✅      | ✅      |
| `service:view`        |          | ✅      | ✅      |
| `employee:view`       |          | ✅      | ✅      |
| `allocation:override` |          | ✅      | ✅      |
| `organisation:manage` |          |         | ✅      |
| `department:view`     |          |         | ✅      |
| `department:manage`   |          |         | ✅      |
| `employee:manage`     |          |         | ✅      |
| `service:manage`      |          |         | ✅      |
| `auditLog:view`       |          |         | ✅      |

## Known gap: department-level scoping isn't real yet

A Manager should probably only see/reassign tasks _within their own department_, not firm-wide
— but nothing in the schema today (Day 5's models) attaches a department to a Task (Task
doesn't exist yet) in a way that's enforceable, and there's no "manager of department X" concept
beyond a User having a single `departmentId`. This design treats Manager's `viewAll`/`reassign`
etc. as firm-wide for now, same as Partner, and flags the department-scoping refinement as a
gap for whichever day actually builds Task assignment (Task Engine, Day 44+) to close properly.
Don't build department-scoped enforcement today — there's no Task table to scope yet.

## Where this lives in code

`src/modules/kernel/rbac/permissions.ts` — the `Permission` type, `SystemRole` type, and
`ROLE_PERMISSIONS` matrix, plus a pure `hasPermission(role, permission)` lookup. Kernel owns
this per `docs/ARCHITECTURE.md` ("the permission-check function" is listed under Kernel).
Wiring `hasPermission` into actual route/page enforcement (throwing 403s, gating UI) is Day 15.
