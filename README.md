# Movie Discovery (monorepo)

Angular SPA + NestJS API + Postgres/pgvector. Product checklist: [`ROADMAP.md`](ROADMAP.md).

## Layout

| Path | Description |
|------|-------------|
| [`movie-discovery/`](movie-discovery/) | Angular app (TMDB, inbox, account, …) |
| [`server/`](server/) | NestJS API, migrations, Docker image |
| [`portfolio-site/`](portfolio-site/) | Standalone portfolio page (static) |
| [`docker-compose.yml`](docker-compose.yml) | Postgres + API for local full stack |
| [`scripts/verify-all.ps1`](scripts/verify-all.ps1) / [`scripts/verify-all.sh`](scripts/verify-all.sh) | Regression: FE build/lint/test + server build/`lint:ci`/test (server mirrors CI, no ESLint `--fix`) |

## Quick start (full stack)

From repo root:

```bash
docker compose up --build
```

API: `http://localhost:3001` (`GET /api/health`). Optional env (SMTP, VAPID, crons): see [`server/.env.example`](server/.env.example) and comments in `docker-compose.yml`.

## Frontend + API in dev

1. Start API: `cd server && npm install && npm run start:dev` (or use Compose for `db` + `api` only).
2. Start Angular: `cd movie-discovery && npm install && npm start` → `http://localhost:4200` — dev proxy sends `/api` to `http://127.0.0.1:3001`.

Details: [`movie-discovery/README.md`](movie-discovery/README.md) (Backend API section), [`server/README.md`](server/README.md) (Frontend section).

## Further checks (optional)

| Check | Command | Notes |
|-------|---------|--------|
| Server e2e | `cd server && npm run test:e2e` | Needs Postgres (e.g. `docker compose up db` or full stack). |
| Playwright (browser) | `cd movie-discovery && npm run e2e` | One-time: `npm run e2e:install` (Chromium). |

The scripts [`scripts/verify-all.ps1`](scripts/verify-all.ps1) / [`scripts/verify-all.sh`](scripts/verify-all.sh) run **fast** regression only (build + lint + unit tests); for `server` they call `npm run lint:ci` (same as the CI workflow). Use `cd server && npm run lint` locally when you want ESLint `--fix`. They do **not** include the rows above.

## CI (GitHub Actions)

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on push/PR:

| Job | What runs |
|-----|-----------|
| `secret-scan` | gitleaks |
| `movie-discovery` | `npm ci` → lint → `test:ci` → `build:prod` |
| `server` | `npm ci` → `npm run lint:ci` → `npm run build` → `npm test` (`lint:ci` = ESLint без `--fix`, см. `server/package.json`) |
| `docker-build` | `docker build ./server` |

Server e2e and Playwright are **not** in CI (same scope as `verify-all`); run them locally when needed (see *Further checks* above).
