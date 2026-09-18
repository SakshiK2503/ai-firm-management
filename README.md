# AI Operations OS

Internal build. See [`CLAUDE.md`](./CLAUDE.md) for working rules, [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
for the module map, and [`docs/roadmap.xlsx`](./docs/roadmap.xlsx) (`Daily Plan` tab) for the day-by-day plan.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL once Postgres is running (Day 4+)
npm run dev
```

## Scripts

- `npm run dev` / `build` / `start` — Next.js
- `npm run lint` — ESLint
- `npm run format` / `format:check` — Prettier
- `npm run typecheck` — TypeScript, no emit

## Git workflow

- `main` is the deployable branch. Work happens on short-lived feature branches, one roadmap
  day (or a few related days) per branch, merged via PR.
- Every commit that closes a Daily Plan row is `feat: <feature> (Day N)` (see `CLAUDE.md`).
- A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files. CI (added
  Day 10) runs the full lint + test + build on every push.
