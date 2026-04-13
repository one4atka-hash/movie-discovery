# Portfolio Site (separate project)

This folder will host a standalone portfolio page describing architectural decisions and skills demonstrated across:

- `movie-discovery/` (this repo)
- `server/` (NestJS API + Postgres/pgvector)
- future projects to be added later

Planned: lightweight static site (no backend), deployable to Netlify/Vercel/GitHub Pages.

**Status:** `ROADMAP.md` in the repo is fully checked off; deferred work (ML v2, server email/push delivery, etc.) is explicitly labeled there, not as unfinished MVP scope.

**Regression:** from repo root — Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-all.ps1`; Unix/macOS/CI: `sh scripts/verify-all.sh` — runs build + lint + unit tests for `movie-discovery` and `server` (see `ROADMAP.md` summary).

