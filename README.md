# AI Operations OS

Internal build. See [`CLAUDE.md`](./CLAUDE.md) for working rules, [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
for the module map, and [`docs/roadmap.xlsx`](./docs/roadmap.xlsx) (`Daily Plan` tab) for the day-by-day plan.

## Local development

```bash
npm install
npx prisma dev -d -n ai-firm-management   # starts a local Postgres, prints a DATABASE_URL
cp .env.example .env
```

**Then open `.env` and replace the placeholder `DATABASE_URL` and `SHADOW_DATABASE_URL` with
the ones `prisma dev` just printed** (they won't match — `.env.example`'s port/db-name are just
a generic placeholder, not what `prisma dev` actually picked). Forgetting this step is the most
common setup error: `prisma migrate deploy`/`dev` will fail with `P1001: Can't reach database
server` if the port is wrong.

```bash
npx prisma migrate dev
npm run db:seed
npm run dev
```

Sign in at `/login` with the seed user: `owner@zelox.in` / `ChangeMe123!` (a dev-only password,
not a real secret — see `prisma/seed-data.ts`).

`npx prisma dev` needs to be started once per machine reboot (`npx prisma dev ls` shows running
servers — if `ai-firm-management` shows `not_running`, run `npx prisma dev start
ai-firm-management` to bring back the _same_ connection string, no `.env` edit needed on
restart). A Dockerized Postgres works too if you'd rather not use Prisma's built-in dev server —
point `DATABASE_URL` at it instead.

## Scripts

- `npm run dev` / `build` / `start` — Next.js
- `npm run lint` — ESLint
- `npm run format` / `format:check` — Prettier
- `npm run typecheck` — TypeScript, no emit
- `npm run test` / `test:watch` — Vitest (unit/API)
- `npm run test:e2e` — Playwright (E2E, needs system Chrome — see `playwright.config.ts`)

## Git workflow

- `main` is the deployable branch. Work happens on short-lived feature branches, one roadmap
  day (or a few related days) per branch, merged via PR.
- Every commit that closes a Daily Plan row is `feat: <feature> (Day N)` (see `CLAUDE.md`).
- A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files. CI (added
  Day 10) runs the full lint + test + build on every push.
