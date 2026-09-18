# AI Operations OS

Internal build. See [`CLAUDE.md`](./CLAUDE.md) for working rules, [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
for the module map, and [`docs/roadmap.xlsx`](./docs/roadmap.xlsx) (`Daily Plan` tab) for the day-by-day plan.

## Local development

The dev database is a hosted Supabase Postgres project (switched from Prisma's local embedded
`prisma dev`/PGlite server on 2026-09-19 — PGlite was unstable under sustained session load,
repeatedly dropping connections; a real hosted Postgres doesn't have that problem). You don't
need Supabase's anon/publishable/secret API keys for anything here — this project talks to
Postgres directly via Prisma, not through Supabase's client SDK.

```bash
npm install
cp .env.example .env
```

**Open `.env` and fill in the real connection strings** from the Supabase project's dashboard
(**Connect** button → connection string, or **Project Settings → Database**):

- `DATABASE_URL` — the **direct connection** (port 5432) is simplest for a small project; add
  `?sslmode=require&uselibpqcompat=true` (the `uselibpqcompat` flag matters — without it, `pg`
  treats `sslmode=require` as `verify-full` and the connection fails with a self-signed
  certificate error).
- `SHADOW_DATABASE_URL` — Prisma Migrate needs a **separate** database to diff schema changes
  into (never point this at the same database as `DATABASE_URL` — `migrate dev` creates/drops
  the whole schema in it, which would wipe real data if they were the same). Supabase's pooled
  connection can't create databases, but the direct connection can:
  `CREATE DATABASE prisma_shadow;`, then point `SHADOW_DATABASE_URL` at that database with the
  same host/port/query params.

```bash
npx prisma migrate deploy   # applies existing migrations (use `migrate dev` only when authoring a new one)
npm run db:seed
npm run dev
```

Sign in at `/login` with a seed user (all share the password `ChangeMe123!`, a dev-only
credential — see `prisma/seed-data.ts`):

| Email               | Role     |
| ------------------- | -------- |
| `owner@zelox.in`    | Partner  |
| `manager@zelox.in`  | Manager  |
| `preparer@zelox.in` | Preparer |

If login ever fails with these credentials, reseed (`npm run db:seed`) before assuming something
is broken — `prisma/seed-data.test.ts` used to delete the real seed organisation as its own
"cleanup" every time the unit test suite ran (fixed 2026-09-19), and it's generally safe to
reseed since `seedDatabase()` is idempotent.

## Scripts

- `npm run dev` / `build` / `start` — Next.js
- `npm run lint` — ESLint
- `npm run format` / `format:check` — Prettier
- `npm run typecheck` — TypeScript, no emit
- `npm run test` / `test:watch` — Vitest (unit/API)
- `npm run test:e2e` — Playwright (E2E, needs system Chrome — see `playwright.config.ts`)
- `npm run verify:no-secrets` — scans the built client bundle for `DATABASE_URL`/
  `SHADOW_DATABASE_URL`; run after `npm run build`

## Git workflow

- `main` is the deployable branch. Work happens on short-lived feature branches, one roadmap
  day (or a few related days) per branch, merged via PR.
- Every commit that closes a Daily Plan row is `feat: <feature> (Day N)` (see `CLAUDE.md`).
- A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files. CI (added
  Day 10) runs the full lint + test + build on every push.
