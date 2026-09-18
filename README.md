# AI Operations OS

Internal build. See [`CLAUDE.md`](./CLAUDE.md) for working rules, [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
for the module map, and [`docs/roadmap.xlsx`](./docs/roadmap.xlsx) (`Daily Plan` tab) for the day-by-day plan.

## Local development

```bash
npm install
npx prisma dev -d -n ai-firm-management   # starts a local Postgres, prints a DATABASE_URL
cp .env.example .env                       # then edit DATABASE_URL to match what prisma dev printed
npx prisma migrate dev
npm run dev
```

`npx prisma dev` needs to be started once per machine reboot (`npx prisma dev ls` shows running
servers, `npx prisma dev start ai-firm-management` restarts a stopped one). A Dockerized
Postgres works too if you'd rather not use Prisma's built-in dev server — point `DATABASE_URL`
at it instead.

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
