# Movie Discovery

## Кратко (RU)

Каталог фильмов на Angular: поиск TMDB, карточка, избранное, тёмная/светлая тема, уведомления о релизах и ссылки на стриминги (JustWatch / популярные сервисы).

|                       |                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Папка приложения**  | `movie-discovery/`                                                                                                                                        |
| **Запуск**            | `cd movie-discovery` → `npm install` → `npm start` → [http://localhost:4200](http://localhost:4200)                                                       |
| **Ключ API**          | `public/env.js` (после `npm install` копируется из `public/env.example.js`, если файла нет). Поле `TMDB_API_KEY`. На хостинге — переменная `TMDB_API_KEY` |
| **Production-сборка** | `npm run build:prod` → артефакты в **`dist/movie-discovery/browser`**                                                                                     |
| **Живой демо**        | _после деплоя подставь URL:_ `https://your-app.example`                                                                                                   |

---

## At a glance (EN)

|                |                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **App folder** | `movie-discovery/`                                                                                                                      |
| **Dev**        | `cd movie-discovery` → `npm install` → `npm start` → [http://localhost:4200](http://localhost:4200)                                     |
| **API key**    | `public/env.js` (created from `public/env.example.js` on `npm install` if missing). Set `TMDB_API_KEY`. Hosting: `TMDB_API_KEY` env var |
| **Production** | `npm run build:prod` → output **`dist/movie-discovery/browser`**                                                                        |
| **Live demo**  | _add after deploy:_ `https://your-app.example`                                                                                          |

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
- Unit/component tests with **Vitest** (via `ng test`).

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

- Node.js **20.19+** рекомендуется (требование Angular CLI). Скрипты `npm start` / `ng build` в этом проекте вызывают **Node 22.12** через `npx`, если в PATH старая версия — локальный запуск обычно работает и без обновления системного Node.
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

## API key (TMDB)

1. После `npm install` при необходимости появится **`public/env.js`** (копия `public/env.example.js`).
2. Откройте `public/env.js` и задайте **`TMDB_API_KEY`** (v3 API Key, 32 hex-символа с [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)).
3. Файл `public/env.js` **не коммитится** (см. `.gitignore`).

Базовые URL для dev/prod — в `src/environments`. На деплое задайте **`TMDB_API_KEY`** в настройках хостинга (Vercel/Netlify и т.д.).

Файл **`.env.example`** в корне приложения — справочный комментарий; Angular его сам не подхватывает.

### Dev proxy (CORS-free)

In development the app is configured to call TMDB through a same-origin proxy prefix:

- Base URL: `/tmdb`
- Proxy config: `proxy.conf.json` (wired in `angular.json`)

This avoids browser CORS issues. Do **not** set `TMDB_BASE_URL=https://api.themoviedb.org/3` in `public/env.js` when running `npm start`.

### Backend API (NestJS, optional)

The dev server proxies **`/api`** → `http://127.0.0.1:3001` (see `proxy.conf.json`). Start the API from `server/` (Docker Compose or `cd server && npm run start:dev`).

- **Account → Server JWT**: paste a token from `POST /api/auth/register` or `login` to use exports, import, public profile, and the **Send test email** dev action (calls `POST /api/email/dev/send-test`; requires `DEV_EMAIL_SEND_ENABLED` and `SMTP_*` on the API).
- **Movie details** (with JWT): **Timeline** can create server **release reminders** with in-app / Web Push / **email** channels (email delivery needs SMTP on the server; Web Push needs VAPID).

**RU:** Прокси `/api` на локальный Nest. В Account вставьте JWT — экспорт, импорт, публичный профиль и кнопка теста SMTP. На странице фильма — серверные напоминания о релизе с каналом email.

### Постеры не грузятся (403 / блокировки)

Приложение ходит за картинками через тот же origin: префикс **`/imgtmdb`** (см. `proxy.conf.json` в dev и `vercel.json` / `netlify.toml` в проде). Если постеры пустые, проверьте, что запросы идут на **`/imgtmdb/...`**, а не напрямую на `image.tmdb.org`, и что DNS не подменяет TMDB на `localhost`.

## Scripts

- `npm start` - dev server
- `npm run dev:win` - Windows: проверка порта 4200 и запуск dev (см. `scripts/dev.ps1`)
- `npm run build` - production build (конфигурация по умолчанию в `angular.json`)
- `npm run build:prod` - явная production-сборка
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
