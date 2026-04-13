# Portfolio Site (separate project)

This folder will host a standalone portfolio page describing architectural decisions and skills demonstrated across:

- `movie-discovery/` (this repo)
- `server/` (NestJS API + Postgres/pgvector)
- future projects to be added later

Planned: lightweight static site (no backend), deployable to Netlify/Vercel/GitHub Pages.

**Status:** `ROADMAP.md` in the repo is fully checked off; deferred work (ML v2, SMTP, outbound Web Push/email from workers, etc.) is explicitly labeled there. The app can **register** push subscriptions with the API (`GET /api/push/vapid-public`, `POST /api/push/subscribe` when JWT + VAPID public key are set); **sending** pushes from the server remains future work.

**Regression:** from repo root — Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-all.ps1`; Unix/macOS/CI: `sh scripts/verify-all.sh` — runs build + lint + unit tests for `movie-discovery` and `server` (see `ROADMAP.md` summary).

