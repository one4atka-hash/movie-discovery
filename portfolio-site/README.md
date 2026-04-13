# Portfolio Site (separate project)

This folder will host a standalone portfolio page describing architectural decisions and skills demonstrated across:

- `movie-discovery/` (this repo)
- `server/` (NestJS API + Postgres/pgvector)
- future projects to be added later

Planned: lightweight static site (no backend), deployable to Netlify/Vercel/GitHub Pages.

**Status:** `ROADMAP.md` in the repo is fully checked off; deferred work (ML v2, SMTP digest/outbox for alert rules, full alert matcher + digest email, etc.) is explicitly labeled there. Push: registration + outbound sends (dev self-test, release-reminder cron, dev `alerts/run` when a rule requests web push, all with VAPID). Email: outbound SMTP (`SMTP_*`) + dev `POST /api/email/dev/send-test` (JWT, `DEV_EMAIL_SEND_ENABLED`); release-reminder cron sends email when `channels.email` is set; movie details Timeline lets users enable the email channel for server reminders.

**Regression:** from repo root — Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-all.ps1`; Unix/macOS/CI: `sh scripts/verify-all.sh` — runs build + lint + unit tests for `movie-discovery` and `server` (see `ROADMAP.md` summary).

