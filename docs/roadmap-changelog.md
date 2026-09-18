# Roadmap v2 — what changed and why

Starting point: `AI_Firm_Operations_Day_Wise_Roadmap_PRD_Checked.xlsx` (160 days), which already
included a self-audit (`PRD Coverage`, `Required Changes` tabs) correctly flagging several gaps.
This pass closes the _structural_ gaps (schema/workflow-level, expensive to retrofit) and a few
the self-audit missed. Result: **167 days / 34 weeks**, same phase order, all other tabs
regenerated to stay consistent.

## Added as new Daily Plan rows

| Where                                                      | New row                       | Why                                                                                                                                                         |
| ---------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation, after Repo+tooling                             | **Automated testing setup**   | Nothing in the original plan set up a real test runner — every acceptance check was manual. This is what lets Claude test its own work.                     |
| Foundation, after Seed data                                | **CI pipeline**               | Original CI didn't appear until day 156. With 160+ sequential days of changes, you want regressions caught from week 1.                                     |
| Documents & Knowledge, after Client document area          | **Upload security**           | No malware scanning / encryption-at-rest / file-type limits anywhere, despite the system storing client financial documents (PAN, GSTIN, etc.).             |
| Communication & AI Intake, before Communication data model | **AI provider governance**    | The PRD leans entirely on AI for intake, but nothing configured API keys/secrets, a cost budget, rate limits, or a fallback if the AI service is down.      |
| Communication & AI Intake, after Attachment understanding  | **Voice-note intake**         | PRD §8/§9 explicitly lists voice notes as an input type; roadmap self-audit flagged this as missing but hadn't added a row.                                 |
| Communication & AI Intake, after AI result → proposed task | **Internal AI task creation** | PRD §31/self-audit: employees should be able to type an instruction and get the same AI pipeline as WhatsApp/email. Missing entirely.                       |
| Management Command Centre, after Rework                    | **Delay-cause attribution**   | PRD requires distinguishing employee/client/manager/dependency-caused delays for trustworthy analytics. Self-audit flagged as "Missing" but no row existed. |

## Edited in place (same row, expanded scope)

- **Core schema** (Day 5): now explicitly calls for `org_id` scoping on every table — cheap now,
  expensive if you decide to sell this to other firms later and have to retrofit it.
- **Status state machine** (Task Engine): now specifies the _full_ PRD status model (New → AI
  Processing → Awaiting Allocation → ... → Archived, plus Cancelled) and requires testing every
  valid/invalid transition, not a simplified version.
- **Archive rules** (Documents & Knowledge): now requires a retention policy per document
  category, with legal-hold exceptions.
- **Deadline rules** (Deadlines & SLA): now requires three deadline types — statutory,
  client-committed, internal — each with its own safety margin, per PRD §33.

## Structural fixes

- **Release Map** was already stale (capped at day 150 vs. a 160-day plan) and, on inspection,
  had a mislabeled header column ("Scope" holding an end-day number). Regenerated with correct
  headers (`Start Day` / `End Day`) and 9 releases whose day ranges are contiguous and
  non-overlapping, matching the actual phase order.
- **Feature Tracker** and **Weekly Review** regenerated from the new Daily Plan so they stay in
  sync (102 tracked features, 34 weekly checkpoints).
- Status dropdowns (data validation) extended to cover the new row counts on both `Daily Plan`
  and `Feature Tracker`.

## Still worth a deliberate decision before you start (not fixed automatically)

- Whether to keep Next.js/Postgres/Prisma (assumed by the original roadmap but never stated in
  the PRD) or use something else.
- Hosting/object-storage provider, and which WhatsApp API vendor (Meta Cloud API, a BSP, etc.).
- PII/data-residency requirements if you ever do sell this outside your own firm.
