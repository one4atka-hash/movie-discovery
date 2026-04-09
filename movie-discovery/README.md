# Movie Discovery

## Кратко (RU)

Каталог фильмов на Angular: поиск TMDB, карточка, избранное, тёмная/светлая тема, уведомления о релизах и free‑cinema (public domain).

| | |
|---|---|
| **Папка приложения** | `movie-discovery/` |
| **Запуск** | `cd movie-discovery` → `npm install` → `npm start` → [http://localhost:4200](http://localhost:4200) |
| **Ключ API** | Скопировать `.env.example` → `.env`, задать `TMDB_API_KEY` (и при деплое — в настройках хостинга) |
| **Production-сборка** | `npm run build:prod` → артефакты в **`dist/movie-discovery/browser`** |
| **Живой демо** | *после деплоя подставь URL:* `https://your-app.example` |

---

## At a glance (EN)

| | |
|---|---|
| **App folder** | `movie-discovery/` |
| **Dev** | `cd movie-discovery` → `npm install` → `npm start` → [http://localhost:4200](http://localhost:4200) |
| **API key** | Copy `.env.example` to `.env`, set `TMDB_API_KEY` (also in hosting env vars) |
| **Production** | `npm run build:prod` → output **`dist/movie-discovery/browser`** |
| **Live demo** | *add after deploy:* `https://your-app.example` |

---

Movie Discovery is an online cinema catalog application.
Goal: provide a convenient movie discovery experience with room for future monetization.

## Project goals

- Show production-oriented Angular architecture and development practices.
- Build a responsive and fast movie discovery app on top of free APIs.
- Demonstrate scalable patterns: feature structure, shared UI, state management, interceptors, and testing.
- Keep clear extension points for promo blocks, partner links, and future premium features.

## Tech stack and engineering approach

- Angular 21 standalone APIs.
- TypeScript + RxJS.
- Feature-first architecture (`core`, `shared`, `features`).
- HTTP interceptors (auth/api key + global error handling).
- Signals-based store + facade for domain state.
- Lazy loaded routes + route resolver for details page.
- Reusable UI primitives (button, loader, empty/error states).
- Infinite scroll directive via `IntersectionObserver`.
- ESLint + Prettier + Husky + lint-staged + commitlint.
- Unit/component testing with Jasmine + Karma.

## Key architecture decisions

- `core` holds cross-cutting services (interceptors, config, error notifications, storage/logging).
- `shared` contains reusable UI and generic utilities/pipes/directives.
- `features/movies` encapsulates domain logic and pages (search/details/favorites).
- Data flow is organized as `service -> store -> facade -> UI`.
- Network and runtime errors are surfaced through a centralized error notifier and banner.

## Functional highlights

- Debounced movie search with pagination/infinite load.
- Movie details page with preloading through resolver.
- Favorites list persisted in browser storage.
- Dark/light theme toggle.
- Empty, loading, and error states handled in UI.
- Promo area reserved for monetization experiments.

## Getting started

### Prerequisites

- Node.js **20.19+** (required by Angular CLI)
- npm 10+

### Install

```bash
npm install
```

### Run in development

```bash
npm start
```

App is available at `http://localhost:4200`.

## Environment variables

Create `.env` locally from `.env.example` and set your TMDB API key:

```bash
TMDB_API_KEY=your_tmdb_api_key_here
```

Current environment files are in `src/environments`.
For deployment, configure the same key in your hosting provider environment settings.

### Dev proxy (CORS-free)

In development the app is configured to call TMDB through a same-origin proxy prefix:

- Base URL: `/tmdb`
- Proxy config: `proxy.conf.json` (wired in `angular.json`)

This avoids browser CORS issues. Do **not** set `TMDB_BASE_URL=https://api.themoviedb.org/3` in `public/env.js` when running `npm start`.

## Scripts

- `npm start` - dev server
- `npm run build` - default production build
- `npm run build:prod` - explicit production build configuration
- `npm run lint` - lint TypeScript sources
- `npm test` - run tests in watch mode
- `npm run test:ci` - headless test run for CI

## Build and deploy

### Production build

```bash
npm run build:prod
```

Build output path:

`dist/movie-discovery/browser`

### Vercel

Repository includes `vercel.json` with SPA rewrite rule.

Recommended settings:

- Build command: `npm run build`
- Output directory: `dist/movie-discovery/browser`
- Add environment variable(s): `TMDB_API_KEY`

### Netlify

Repository includes `netlify.toml` with SPA redirect.

Recommended settings:

- Build command: `npm run build`
- Publish directory: `dist/movie-discovery/browser`
- Add environment variable(s): `TMDB_API_KEY`

## Screenshots / demo

Add screenshots or GIFs to make review faster:

- `docs/screenshots/search-page.png`
- `docs/screenshots/details-page.png`
- `docs/screenshots/favorites-page.png`
- `docs/screenshots/theme-toggle.gif`

