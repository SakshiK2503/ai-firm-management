# Architecture Notes — Day 1

Defines the module map, dependency layering, and API/service structure for the AI Operations
OS, so that the 167-day build (`docs/roadmap.xlsx`, tab `Daily Plan`) has a place for every
feature to live without later modules creating circular dependencies on earlier ones.

Source for the module list: the 19 phases in `Daily Plan` (Foundation through Integrations &
Production). Written before the full PRD was available in this repo, so module
responsibilities were originally inferred from the Daily Plan's `Feature` / `Build / Focus`
columns and the non-negotiable principles in `CLAUDE.md`.

**Update (2026-09-18):** the founder provided the actual PRD - now at `docs/PRD.md`, with its
architecture diagrams in `docs/prd-diagrams/` (the changelog that used to live at `docs/PRD.md`
moved to `docs/roadmap-changelog.md`, matching what `CLAUDE.md` already called it). Cross-checked
this module map against it: the PRD's own "six engines" framing (§52 - Intake, Workflow,
Allocation, Knowledge, Intelligence, Agent) lines up with the five-layer map below without
requiring changes. Worth a closer re-read once Communication & AI Intake (Day 95+) is actually
being designed - the PRD treats `Communication` as its own persisted entity (§38), not just
something the `intake` module processes in passing.

## Layering

Five layers, each may only import from layers below it. Nothing imports upward or sideways
across an unrelated module. This is the rule Day 1's acceptance check ("review future modules
fit without circular dependencies") is checking for.

```
5  Surface        command-centre, portal, integrations
4  Intelligence   ai-intelligence, ai-agents
3  Process        intake, allocation, review, workbench
2  Domain         identity, clients, services, tasks, documents, deadlines, time-economics
1  Kernel         db, auth, rbac, validation, errors, logging, audit, org-scope
```

- **Kernel** — no dependency on any other module. Everything else depends on it. Owns: Prisma
  client access, session/auth primitives, the permission-check function, shared zod validation
  helpers, the API error shape, the logger, the audit-log writer, and the `org_id` scoping
  helper every query must go through.
- **Domain** — the system-of-record entities (Organisation/Department/User/Role, Client,
  Service, Task + its status state machine, Document, Deadline, Time entry/cost). Each domain
  module depends only on Kernel and may depend on other Domain modules in one direction only:
  `identity → clients → services → tasks → documents`, `tasks → deadlines`,
  `tasks → time-economics`. A domain module never imports from Process, Intelligence, or
  Surface.
- **Process** — cross-domain orchestration: turning intake into tasks (`intake`), scoring and
  assigning them (`allocation`), quality gates (`review`), the employee's daily task list
  (`workbench`). Depends on Kernel + Domain, never on Intelligence or Surface, and process
  modules don't depend on each other except `intake → allocation` (intake produces the proposed
  task allocation reads).
- **Intelligence** — `ai-intelligence` (management-facing insights) and `ai-agents` (execution
  agents). Depends on Kernel + Domain + Process outputs, but only ever _reads_ domain data and
  _writes_ through Process/Domain service functions — never direct Prisma writes to
  system-of-record tables. This is where principle 7 ("AI proposes; code and humans decide") is
  enforced structurally: an AI module has no code path to mutate task status, allocation, or
  deadlines except by calling the same service function a human-triggered API route calls, which
  applies the same validation, RBAC, and audit logging.
- **Surface** — `command-centre` (dashboards), `portal` (client-facing delivery), `integrations`
  (WhatsApp/email/etc.). Depends on everything below. Nothing depends on Surface.

Per CLAUDE.md's build-incrementally principle, Intelligence and most of Process (`intake`,
`allocation`) don't get real implementations until their scheduled phase (Day 95+) — Kernel and
Domain need to be stable and in daily use first. The layering exists now so that when that work
starts, it has an established seam to plug into instead of reaching backward into Domain
internals.

## Module map (roadmap phase → module → layer)

| Phase (Daily Plan)         | Module folder                           | Layer         | Responsibility                                                               |
| -------------------------- | --------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| Foundation                 | `kernel`                                | Kernel        | db, auth, validation, errors, logging, seed, CI                              |
| Auth & Security            | `identity` (auth slice) + `kernel/rbac` | Kernel/Domain | login, sessions, route protection, RBAC model + enforcement                  |
| Organisation               | `identity`                              | Domain        | Organisation, Department, User/Employee, Role                                |
| Client Management          | `clients`                               | Domain        | Client records, contacts, relationships                                      |
| Service Master             | `services`                              | Domain        | Service/task-type catalogue, department-service mapping                      |
| Task Engine                | `tasks`                                 | Domain        | Task entity + full status state machine                                      |
| Employee Workbench         | `workbench`                             | Process       | per-employee task list, updates, mobile views                                |
| Review & Quality           | `review`                                | Process       | review/approval workflow, rework loop, delay-cause attribution               |
| Documents & Knowledge      | `documents`                             | Domain        | document storage, retention/archive rules, upload security                   |
| Time & Economics           | `time-economics`                        | Domain        | time entries, cost computation                                               |
| Deadlines & SLA            | `deadlines`                             | Domain        | statutory/client-committed/internal deadlines, safety margins                |
| Communication & AI Intake  | `intake`                                | Process       | AI provider governance, WhatsApp/email/voice/internal intake → proposed task |
| Allocation Engine          | `allocation`                            | Process       | allocation scoring, assignment, confirmation queue                           |
| Management Command Centre  | `command-centre`                        | Surface       | exception dashboards, delay-cause views                                      |
| Audit & Security           | `kernel/audit` (hardening)              | Kernel        | audit trail completeness, security hardening pass                            |
| AI Management Intelligence | `ai-intelligence`                       | Intelligence  | management-facing AI insights                                                |
| AI Execution Agents        | `ai-agents`                             | Intelligence  | AI agents that act via Process/Domain service calls                          |
| Client Portal & Delivery   | `portal`                                | Surface       | client-facing views/delivery                                                 |
| Integrations & Production  | `integrations`                          | Surface       | external system integrations, production hardening                           |

Note `identity` and `kernel/rbac` are listed together because Auth & Security (Day 11-16) is
building the enforcement mechanism (session, route protection, permission middleware) that lives
in Kernel, using the Role/User data that Organisation (Day 17+) later builds out fully — Day 11
just needs a minimal User/Role shape to authenticate against. This is the one place two phases
share a module; it's called out here so it isn't mistaken for scope creep later.

## Physical structure (Next.js app, from Day 2)

```
/prisma                     schema.prisma, migrations/, seed.ts
/src
  /modules
    /kernel
      /db                    prisma client singleton, org-scope query helper
      /auth                  session helpers, current-user/current-org accessors
      /rbac                  permission matrix + can(user, action, resource) check
      /validation            shared zod schemas/helpers
      /errors                ApiError class, error → HTTP response mapping
      /logging               structured logger
      /audit                 audit-log writer, audit event types
    /identity  /clients  /services  /tasks  /documents  /deadlines  /time-economics
      /*.service.ts          business logic, the ONLY code allowed to call Prisma for this module
      /*.schema.ts            zod input/output schemas
      /*.types.ts
    /workbench  /review  /intake  /allocation
      (Process — same shape, calls Domain .service.ts functions, never Domain's Prisma models directly)
    /ai-intelligence  /ai-agents
      (Intelligence — calls Process/Domain .service.ts functions only)
    /command-centre  /portal  /integrations
      (Surface — calls the above; owns no Prisma models of its own beyond view-only reads it doesn't already have a service for)
  /app
    /api/<module>/route.ts    thin: parse request → call module service → shape response
    /(app)/<module>/page.tsx  UI, organized to mirror the module map
```

**API/service rule:** an API route or React server component never imports `@prisma/client`
directly. It calls a function from that module's `*.service.ts`. The service function is what's
unit/API-tested (Day 3's test harness). This is what makes "explainable automation" and "audit
trail" enforceable in one place instead of scattered across routes — every write path is a
service function, and service functions are where RBAC checks, validation, and audit-log writes
happen, not in the route handler and not only in the UI.

## Cross-cutting rules baked into every module from Day 1

1. Every Prisma model that isn't purely global config carries `orgId`, and every service
   function takes the current org from the authenticated session, not from client input —
   closes the "org-scoping as afterthought" risk called out in CLAUDE.md.
2. Every service function that performs a create/assign/reassign/approve/delete calls the
   Kernel audit writer before returning.
3. Every service function that gates on role/department calls the Kernel `rbac.can()` check
   before doing anything else — enforced in the API layer per principle 6, never only in the UI.
4. AI-produced results are inserted as _proposals_ (their own table/status), never written into
   a system-of-record field directly. A human or a deterministic rule promotes a proposal into
   the real record. This is the concrete mechanism behind "AI is an assistant, not the system of
   record."

## Enforcement

Design review (this document) satisfies Day 1's acceptance check. The check becomes machine-
enforced starting Day 2: an import-boundary lint rule (dependency-cruiser or
`eslint-plugin-boundaries`, decided when the repo is scaffolded) encodes the layering table above
and runs in CI (Day 10) so a future day can't introduce a circular or backward import without
failing the build. Recorded here rather than re-litigated later.

## Open decisions for the founder (not blocking Day 1)

- Stack: proceeding with Next.js + TypeScript + PostgreSQL + Prisma as CLAUDE.md assumes.
  Flagging per "confirm before Day 2 if you want to change it" — say now if you want something
  else, otherwise Day 2 scaffolds this.
- WhatsApp API vendor and object-storage provider — not needed until Communication & AI Intake
  (Day 95+) and Documents & Knowledge (Day 73+) respectively; no action needed yet.
