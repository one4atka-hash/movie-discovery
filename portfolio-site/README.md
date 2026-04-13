# Portfolio Site (separate project)

This folder will host a standalone portfolio page describing architectural decisions and skills demonstrated across:

- `movie-discovery/` (this repo)
- `server/` (NestJS API + Postgres/pgvector)
- future projects to be added later

The repository root [`README.md`](../README.md) summarizes the monorepo layout, Docker Compose, and dev proxy (`/api`).

Planned: lightweight static site (no backend), deployable to Netlify/Vercel/GitHub Pages.

**Status:** `ROADMAP.md` in the repo is fully checked off; deferred work (ML v2, SMTP digest/outbox for alert rules, full alert matcher + digest email, etc.) is explicitly labeled there. Push: registration + outbound sends (dev self-test, release-reminder cron, dev `alerts/run` when a rule requests web push, all with VAPID). Email: outbound SMTP (`SMTP_*`) + dev `POST /api/email/dev/send-test` (JWT, `DEV_EMAIL_SEND_ENABLED`); Account page exposes a button to trigger that dev test with the pasted Server JWT; release-reminder cron sends email when `channels.email` is set; movie details Timeline lets users enable the email channel for server reminders. `movie-discovery/README.md` documents the `/api` dev proxy and JWT/SMTP flows.

**Regression:** from repo root — Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-all.ps1`; Unix/macOS/CI: `sh scripts/verify-all.sh` — runs build + lint + unit tests for `movie-discovery` and `server` (see `ROADMAP.md` summary).

**Ops:** `docker-compose.yml` at repo root runs Postgres + API; optional env (SMTP, VAPID, crons) are listed in comments and in `server/.env.example`. `server/README.md` links to `movie-discovery/README.md` for the Angular `/api` dev proxy.

**Testing:** root `README.md` lists optional `server` Jest e2e and `movie-discovery` Playwright; `scripts/verify-all.*` stays fast (no e2e).

