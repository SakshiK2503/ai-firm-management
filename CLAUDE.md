# AI Operations OS — Working Rules for Claude

This file is read by Claude Code at the start of every session in this repo. It exists so you
(the founder) never have to re-explain architecture or process — only make the product calls
the roadmap can't make for you.

Full spec: `/docs/PRD.md`. Full build plan: `/docs/roadmap.xlsx` (tab: Daily Plan).

## What this product is

An AI-native operations platform for a professional services firm (accounts/tax/audit/tech/
marketing). It turns client communication into structured, allocated, tracked, costed work and
builds a permanent organisational knowledge base. Starts as **single-firm internal tool**, but
the data model must stay multi-tenant-ready (`org_id` on every table) in case it's sold to other
firms later. Do not build multi-tenant UI/billing/onboarding now — just don't make org-scoping
an afterthought in the schema.

## Non-negotiable principles (from PRD §49 — do not violate these for convenience)

1. **One source of truth** — the database is authoritative for work status, not a spreadsheet,
   not a chat log.
2. **Exception-based management** — dashboards surface what needs attention, not everything.
3. **Explainable automation** — every AI decision (allocation, classification) must be able to
   state *why* in plain language, from real fields, not a vague confidence number alone.
4. **Human override always wins** — no AI action is irreversible or un-overridable by an
   authorised user.
5. **Complete audit trail** — no material action (create/assign/reassign/approve/delete) is
   allowed to disappear. If you're not sure whether something is "material," log it.
6. **Role-based security** — an employee only sees what their role and department entitle them
   to. Enforce this in the API layer, never only in the UI.
7. **AI is an assistant, not the system of record** — status, permissions, deadlines, cost, and
   audit are deterministic code. AI proposes; code (and humans) decide.
8. **Build incrementally** — do not start AI intake/allocation/agents work until the operational
   foundation (manual task lifecycle, RBAC, dashboards) is stable and in daily use.
9. **Mobile-friendly** — task updates, approvals, and reviews must work on a phone browser.
10. **Avoid re-entry** — if the system already has a piece of information (client, deadline,
    attachment), never make an employee retype it.

## Definition of done for every roadmap item

A "Daily Plan" row is not done until all four are true:

1. **Built** — the feature described in `Build / Focus` works end-to-end (API + UI where
   applicable), scoped correctly by `org_id` and by role.
2. **Tested automatically** — the `Test / Acceptance Check` for that row is a real automated
   test (unit, API, or Playwright), not a manual click-through. At minimum per feature: happy
   path, a validation/error case, a permission/access case where relevant, and an empty state.
3. **Passing in CI** — the test runs and passes in the CI pipeline, not just on your machine.
4. **Committed** — one small commit, `feat: <feature>`, referencing the Day number, e.g.
   `feat: department creation (Day 15)`.

If a row can't meet all four, mark it `Blocked` in the tracker and say why — don't silently carry
it forward or weaken the test to make it pass.

## How Claude should work through the roadmap

- Work in **weekly batches**, not strictly one day at a time. Implement several consecutive
  Daily Plan rows in a session, run the full test suite after each, and stop to summarize when
  you hit something that needs a product decision (see below) or the end of a phase.
- After each batch, report: what was built, what the automated tests cover, anything you had to
  assume, and any open decision for the founder.
- **Update the tracker as you go**: mark rows `Done`/`Blocked` in the Daily Plan and Feature
  Tracker tabs (or tell the founder exactly which rows to mark, if you can't edit the sheet
  directly).
- **Don't silently reinterpret scope.** If a Daily Plan row is ambiguous, state the assumption
  you're making in the commit message or session summary rather than guessing quietly.

## When to stop and ask the founder (product decisions, not build decisions)

Examples of genuinely ambiguous calls that need a human:
- Relative weighting in the allocation score (e.g., client continuity vs. raw skill match).
- What counts as "high enough" AI confidence to auto-create a task vs. queue for confirmation.
- Which department/service taxonomy to seed first.
- Anything touching real client data, real WhatsApp/email credentials, or production secrets.

Everything else — schema shape, test coverage, component structure, refactors — is a build
decision. Make it and move on.

## Known gaps closed before Day 1 (see `docs/roadmap-changelog.md`)

The original roadmap was audited against the PRD and had real gaps: a simplified task-status
model, no automated-testing/CI setup, no multi-tenant-ready schema note, no AI-provider cost/
fallback governance, no upload security/retention policy, no three-way deadline typing, and no
delay-cause attribution. These are now built into the Daily Plan (167 days / 34 weeks) — don't
re-simplify them back out for speed.

## Stack (as assumed by the roadmap — confirm before Day 2 if you want to change it)

Next.js + TypeScript, PostgreSQL + Prisma, a unit/API test runner + Playwright for E2E, CI on
every push. Object storage for documents/attachments. No AI provider is hardwired — the
"AI provider governance" day (Day ~95 area) is where you configure it, with a manual-queue
fallback if it's unavailable.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
