## Movie Discovery App (Angular) — поэтапный план

### 0. Цели проекта
- **Основная цель (портфолио)**: показать продакшн‑подход к Angular SPA — архитектура по фичам, core/shared, state management (signals), работа с внешним API, тесты, производительность, DX.
- **Дополнительная цель (домашний онлайн‑кинотеатр)**: удобный поиск, красивые карточки фильмов, избранное, бесконечный скролл, тёмная тема.
- **Бонус (монетизация)**: предусмотреть место под блок с рекламой/партнёрскими ссылками/донатами, но внедрять после готового MVP.

Рекомендуемые внешние сервисы:
- **Каталог фильмов**: TMDB API или аналогичный бесплатный API.
- **Хостинг фронта**: Vercel или Netlify (free tier).
- **(Опционально позже)**: Firebase/Auth0 для аутентификации, Stripe/Boosty/Patreon для донатов.

---

### Этап 1. Инициализация проекта
- [x] Создать Angular‑проект через `Angular CLI`.
- [x] Настроить структуру **feature-based** (папки `core/`, `shared/`, `features/`).
- [x] Подключить **ESLint + Prettier** (конфиги в репозитории; `npm run lint` / Prettier через `lint-staged`).
- [x] Настроить **alias‑пути** (tsconfig paths).
- [x] Настроить **environments** (`dev` / `prod`) и хранение API key.
- [x] Сделать базовый **layout** (`ShellComponent`): шапка, область контента, футер (опционально место под блок монетизации).

---

### Этап 2. Архитектура ядра и shared‑слоя

#### 2.1 Core layer
- [x] Создать папку `core/`.
- [x] Реализовать `ApiInterceptor` (подстановка base URL и API key).
- [x] Реализовать `ErrorInterceptor` (единая обработка HTTP‑ошибок).
- [x] Добавить глобальные сервисы: `LoggerService`, `ConfigService` и т.п.

#### 2.2 Shared layer
- [x] Создать папку `shared/`.
- [x] Реализовать UI‑компоненты:
  - [x] `Button`
  - [x] `Loader` (spinner + skeleton)
  - [x] `EmptyState`
- [x] Реализовать pipes:
  - [x] `DateFormatPipe`
  - [x] `ImageFallbackPipe`

---

### Этап 3. Data Access Layer

#### 3.1 MovieService
- [x] Создать сервис `MovieService`:
  - [x] `searchMovies(query, page)` — поиск с пагинацией.
  - [x] `getMovie(id)` — детали фильма.

#### 3.2 Кеширование и хранилище
- [x] Реализовать **кеш‑слой**:
  - [x] Map‑кеш по ключу (query + page / id).
  - [x] TTL (опционально).
  - [x] Использование `shareReplay`.
- [x] Реализовать `StorageService` (обёртка над `localStorage`/`sessionStorage`):
  - [x] `get()`
  - [x] `set()`
  - [x] `remove()`

---

### Этап 4. State Management (Signals + Facade)
- [x] Создать `MovieStore` на сигналах:
  - [x] `movies` signal
  - [x] `loading` signal
  - [x] `error` signal
  - [x] `selectedMovie` signal
- [x] Реализовать методы стора:
  - [x] `search(query)`
  - [x] `loadMovie(id)`
  - [x] `loadNextPage()`
- [x] Создать `MovieFacade`:
  - [x] Публичные сигналы/observable: `movies$`, `loading$`, `error$`, `selectedMovie$`
  - [x] Методы прокидывают вызовы к стору и сервису.

---

### Этап 5. Feature: Movies (базовый модуль фильмов)
- [x] Создать `features/movies/`:
  - [x] `data-access/` — использование `MovieService`, маппинг DTO → view‑model.
  - [x] `ui/` — карточки фильмов.
  - [x] `feature-search/` — контейнер поиска.
  - [x] `feature-details/` — контейнер деталей.
  - [x] `feature-favorites/` — контейнер избранного.

---

### Этап 6. Feature: Search

UI:
- [x] Страница `/search`.
- [x] `Search input` (Reactive Forms).
- [x] Список фильмов (использует shared‑компоненты).
- [x] Loader и Empty state.

Логика:
- [x] RxJS‑цепочка с:
  - [x] `debounceTime`.
  - [x] `distinctUntilChanged`.
  - [x] `filter` (минимум 2 символа).
  - [x] `switchMap` (отмена прошлых запросов).

UX:
- [x] Skeleton loading.
- [x] Обработка ошибок (видимый, но аккуратный error‑state).
- [x] Нет «пустых» переходов без результата.

---

### Этап 7. Feature: Movie Details
- [x] Страница `/movie/:id`.
- [x] Загрузка данных фильма и зависимостей с учётом выбранной TMDB‑локали (без router resolver, с перезапросом при смене языка).
- [x] UI:
  - [x] Постер.
  - [x] Название.
  - [x] Жанры (из ответа `genres` или запасной маппинг по `genre_ids`).
  - [x] Описание.
  - [x] Рейтинг.
- [x] Кнопка «добавить в избранное».
- [x] Обработка ошибок/нет данных.

---

### Этап 8. Feature: Favorites
- [x] Хранить избранное через `StorageService`.
- [x] Кнопка‑переключатель избранного (иконка ♥) на карточке и в деталях.
- [x] Страница `/favorites`:
  - [x] Список сохранённых фильмов.
  - [x] Возможность удалить из избранного.
  - [x] Empty state, если список пуст.

---

### Этап 9. Routing
- [x] Настроить lazy‑loading модулей:
  - [x] `/search`
  - [x] `/movie/:id`
  - [x] `/favorites`
- [x] Настроить preloading strategy (например, preloading details/favorites после первого поиска).
- [x] Подключить resolver для деталей.

---

### Этап 10. Infinite Scroll
- [x] Реализовать `IntersectionObserver`‑директиву/сервис.
- [x] Добавить подгрузку следующих страниц при достижении низа списка.
- [x] Показать loader при догрузке.
- [x] Позаботиться о производительности (trackBy, OnPush).

---

### Этап 11. Performance
- [x] Включить `ChangeDetectionStrategy.OnPush` для контейнеров и list‑компонентов.
- [x] Реализовать `trackBy`‑функции для `*ngFor`.
- [x] Проверить lazy‑loading всех тяжёлых модулей и изображений.
- [x] Оптимизировать размер изображений (quality/size, `srcset`/`sizes` при необходимости).

---

### Этап 12. UI / UX полировка
- [x] Добавить адаптивную сетку (мобильный/планшет/desktop).
- [x] Hover‑эффекты и небольшие анимации.
- [x] Skeleton loaders + shimmer‑эффект.
- [x] Тёмная тема и переключатель темы.
- [x] Красивые error и empty states.
- [x] Место под небольшой промо‑блок (для будущей монетизации).

---

### Этап 13. Error Handling
- [x] Глобальный HTTP‑interceptor для ошибок.
- [x] Единый компонент/сервис для показа ошибок (toast/баннер).
- [x] Возможность «повторить попытку» там, где это оправдано.

---

### Этап 14. Тестирование

Unit tests:
- [x] `MovieService`.
- [x] `MovieStore`.
- [x] `StorageService`.

Component tests:
- [x] Search feature.
- [x] Movie details.
- [x] Favorites.

---

### Этап 15. Dev Experience
- [x] Husky (pre‑commit hook).
- [x] `lint-staged` для форматирования/линта только изменённых файлов.
- [x] Стиль коммитов (conventional commits).

---

### Этап 16. Деплой
- [x] Настроить production build.
- [x] Деплой на Vercel или Netlify.
- [x] Проверить/настроить environment variables (API key и т.п.).
- [x] Протестировать работу приложения в продакшн‑окружении.

---

### Этап 17. README и портфолио
- [x] Написать подробный `README`:
  - [x] Описание проекта и целей.
  - [x] Используемые технологии и подходы (Angular, signals, interceptors, feature‑архитектура, RxJS, тесты и т.д.).
  - [x] Инструкция по запуску/сборке/деплою.
  - [x] Скриншоты/гифки.
- [x] Кратко описать, как проект демонстрирует твои Angular‑скиллы (для HR/тимлидов).

---

### Идеи для следующих итераций (не обязательно для первого релиза)
- [ ] **Аутентификация и профили пользователей** (Firebase/Auth0).
- [ ] **Списки «хочу посмотреть» / истории просмотра**.
- [ ] **Реальный плеер** с интеграцией с легальными источниками/твоим NAS.
- [ ] **Монетизация**:
  - [ ] Нативный промо‑блок с рекомендацией контента/подборок.
  - [ ] Партнёрские ссылки (например, на покупку подписки в другом сервисе).
  - [ ] Блок донатов (Stripe/Boosty/Patreon).

---

### Итерация 2 (backlog по запросу)
- [x] **Монетизация**: добавить виджет донатов в shell (`promo`).
- [x] **Плеер**: добавить «реальный» плеер для трейлеров (TMDB videos → YouTube embed).
- [ ] **Аутентификация**: login/logout + профиль пользователя (MVP, локально).
- [ ] **Персональные списки**:
  - [ ] «Хочу посмотреть»
  - [ ] «История просмотра»

---

### Итерация 3 — CORS fix + продающее портфолио + уникальный продукт

- [x] **CORS (dev)**: защититься от прямого вызова TMDB в dev и форсировать `/tmdb` proxy.
- [x] **Security/DX**: убрать TMDB API key из репозитория (ключ только через `public/env.js` / env vars).
- [x] **Портфолио-упаковка**: home/landing внутри приложения + витрина + “пруфы” компетенций.
- [x] **SEO (база)**: meta + OG/Twitter теги в `index.html`.
- [x] **Уведомления о релизах (MVP)**:
  - [x] Авторизация обязательна (профиль).
  - [x] Подписка на релиз фильма + выбор канала: in-app / web push / email / calendar (.ics).
  - [x] Встроить entrypoint из карточки фильма: кнопка «Следить за релизом» → `/notifications?tmdbId=...`.

#### Итерация 3 — Extras (добавлено по ходу работ)

- [x] **Node compatibility**: Angular CLI требует Node 20.19+ — добавить `engines` + `.nvmrc`.
- [x] **Dev запуск в Cursor на Windows**: поднять `npm start` локально через portable Node 20.19.0 (временный PATH).
- [x] **Extra**: добавить скрипт `movie-discovery/scripts/dev.ps1` для запуска dev-сервера одной командой (portable Node + port check).
- [x] **Extra**: убрать упоминания «портфолио» из Movie Discovery и вынести портфолио в отдельный проект.
- [x] **Extra**: оставить один блок донатов (в shell), убрать второй с главной.
- [x] **Extra**: добавить RU/EN переключение языка (минимум: навигация + ключевые страницы).
- [x] **Extra**: язык в селекте локалей — отображать подписи языков на выбранной локали (Intl.DisplayNames).
- [x] **Extra**: все запросы к TMDB возвращают данные на выбранном языке (`language`) + перезагрузка страниц при смене локали.
- [x] **Extra**: избранное и подписки обновляют title/overview при смене локали TMDB (синхронизация локальных снапшотов).
- [ ] **Extra**: починить DNS/hosts для TMDB — сейчас `api.themoviedb.org` резолвится в localhost (`::1`), из‑за этого прокси `/tmdb` падает (500/ECONNREFUSED).
- [x] **Extra**: починка DNS для TMDB выполнена (Quad9) — поиск снова работает.
- [x] **Extra**: диагностика изображений TMDB (если не грузятся постеры) — проверить доступ к `image.tmdb.org` и блокировки браузера.
- [x] **Extra**: исправить загрузку постеров TMDB при 403 (CloudFront) — проксировать картинки через same-origin `/imgtmdb/*` (dev: `proxy.conf.json`, prod: `vercel.json`/`netlify.toml`) и заменить `https://image.tmdb.org/...` на `/imgtmdb/...` (важно: не использовать префикс `/tmdb*`, иначе матчится API-прокси).
- [x] **Extra**: усилить сохранение избранного (defensive persist/restore), чтобы лайки стабильно сохранялись между перезапусками.
- [x] **Extra**: адаптивная сетка без «сирот»-растягивания (карточка не тянется на всю ширину строки при одном элементе в ряду); размер страницы TMDB по-прежнему 20 записей на запрос.
- [x] **Extra**: оптимизация изображений — на списках грузить мини-версии (w92/w185) + `srcset/sizes`, большие постеры только на странице фильма.
- [x] **Extra**: добавить иконки в шапку для всех пунктов навигации.
- [x] **Extra**: сделать Movie главной страницей — `/` открывает поиск (home), `/search` редиректит на `/`.
- [x] **Extra**: объединить/упростить навигацию Home/Search/Cinema (сейчас сценарии пересекаются).
- [x] **Extra**: убрать страницы/кнопки Cinema и отдельный Home — сделать `/search` стартовой страницей и назвать её Home в навигации.
- [x] **Extra**: просмотр фильма на странице фильма: если фильм уже вышел — показать “Where to watch” (официальные провайдеры); если не вышел — показывать только Follow release.
- [x] **Extra**: трейлеры — починить YouTube embed (SafeResourceUrl / sanitization).
- [x] **Extra**: трейлеры — не передавать `language` в `/movie/{id}/videos`, чтобы не получать пустой список видео на некоторых локалях.
- [x] **Extra**: Alerts UX — сделать интуитивно: постер в списке/форме, понятные действия (календарь через .ics).
- [x] **Extra**: Web notifications UX — убрать отдельный “тест”, отправлять пробное уведомление сразу после сохранения подписки (если выбран канал).
- [ ] **Extra**: Email notifications — подключить реальный сервис отправки (backend + провайдер) для уведомлений в день релиза.
- [x] **Extra**: убрать строку «Каталог на данных TMDB · неофициальное приложение» из футера.
- [ ] **Extra**: «Сервер + AI для просмотра» (легально) — вариант для личной медиатеки: Jellyfin/Plex + локальные файлы, AI-рекомендации через Ollama; добавить интеграцию как опциональный режим.

---

### Итерация 4 — Backend (NestJS) + рекомендации (pgvector)

Цель: сервер для аккаунтов, хранения данных пользователя (избранное/подписки/не нравится), уведомлений и нейросетевых рекомендаций.

- [x] **Инфраструктура**: `server/` (NestJS) + Docker Compose.
- [x] **DB**: Postgres + `pgvector` (под ANN) + миграции (SQL).
- [x] **Auth**: регистрация/логин + JWT.
- [x] **User data API**:
  - [x] Favorites (CRUD по `tmdbId`)
  - [x] Subscriptions (CRUD + каналы)
  - [x] Feedback: `like/dislike/hide/neutral` (+ reason)
- [x] **Recommendations API (MVP)**: эндпоинт с устойчивым форматом ответа (под будущий ANN/rerank).
- [ ] **Embeddings pipeline**: кэш фич фильма из TMDB → эмбеддинг → запись в `movie_features.embedding`.
- [ ] **ANN recommendations**: pgvector поиск похожих фильмов по профилю пользователя + фильтрация `dislike/hide` + диверсификация.
- [ ] **Rerank (опционально)**: нейро‑ре‑ранжирование top‑K кандидатов + объяснения «почему рекомендовано».
- [ ] **Notifications**:
  - [ ] Email провайдер + scheduled job в день релиза.
  - [ ] WebPush (VAPID) через backend (если уйдём от client-only).

#### Итерация 4 — Workstreams (можно делать параллельно)

**A. Backend hardening (без влияния на ML/UX)**
- [x] Валидация конфигов на старте (schema) + убрать небезопасные fallback’и (`JWT_SECRET` обязателен).
- [x] CORS allowlist (без `origin: true`) + `helmet` + лимиты размера body.
- [x] Rate limiting / throttling для `/auth/*` и (опционально) остальных.
- [x] Единый формат ошибок (exception filter) + structured logging (request id).
- [x] Миграции: advisory lock, checksum/immutability, устойчивый путь до папки `migrations/`.
- [x] Привести API к единому контракту ответов (`{ ok, data, error }` или аналог) + убрать DELETE body (сделать `DELETE /favorites/:tmdbId`, `DELETE /subscriptions/:id`).

**B. Recommendations pipeline (pgvector)**
- [ ] TMDB feature cache: endpoints/jobs для загрузки cast/crew/keywords + нормализация в `movie_features`.
- [ ] Embeddings: сервис генерации эмбеддингов + запись `movie_features.embedding` + ретраи/кэш.
- [ ] ANN: pgvector query (cosine) по профилю пользователя (like/favorites) + фильтрация `dislike/hide` + диверсификация.
- [ ] Explanations: «почему рекомендовано» (связать с жанром/актером/похожестью/seed).
- [ ] Тесты рекомендаций: блок-лист, уникальность, холодный старт, детерминированность времени.

**C. DevOps / безопасность (репозиторий)**
- [ ] Секреты: убедиться, что `movie-discovery/public/env.js` не попал в git; **ротировать TMDB ключ** при необходимости.
- [x] Compose reliability: healthchecks (`db` + `api`), `depends_on: service_healthy`, restart policy, env_file.
- [x] Docker hardening: non-root, `npm ci --omit=dev` для runtime, healthcheck.
- [x] CI: workflow на `movie-discovery/` и `server/` (lint/test/build) + `docker build` + secret scanning (gitleaks/trufflehog).

**D. Frontend refactor (переиспользуемость, без конфликтов с backend)**
- [x] Убрать дублирование `language`: единый источник (интерцептор *или* `MovieService.baseParams()`), чтобы не было расхождений.
- [x] Выделить TMDB client helper: join URL, params, text→JSON parse, retry, единая обработка non-JSON.
- [x] Починить/убрать “мертвые” маршруты (`/favorites`, `/notifications`) — либо реализовать страницы, либо удалить редиректы/ключи навигации.
- [x] Упростить state layer: удалить неиспользуемые `store/facade` (переходим на сервисы + локальные сигналы).
- [x] Общий билдер TMDB image URLs (`/imgtmdb/*`) + единый `srcset/sizes`.
- [x] Дотянуть i18n: заменить хардкод строк в шаблонах на `i18n.t()` (details/card) + добавить ключи.

**E. Тестирование (можно параллельно с A–D)**
- [ ] Server e2e: тестировать `/api/*` (учесть global prefix) + happy path по всем контроллерам.
- [ ] Server: тесты 400 для невалидных payloads (Zod/DTO контракты), auth edge-cases (duplicate email, invalid login).
- [ ] Frontend: усилить тесты (не только “creates component”), добавить e2e harness (Playwright/Cypress) smoke-flow.

---

### Итерация 5 — Уникальный «собирательный» продукт (лучше аналогов)

Цель: объединить сильные стороны Letterboxd/Trakt (дневник, вкусы, социальность) + JustWatch (где смотреть) + IMDb/TMDB (масштаб) в один **workflow‑ориентированный** продукт: “что смотреть → где смотреть → когда смотреть → почему именно это”.

#### 5.1 Smart Streaming Hub (агрегация «где смотреть» под пользователя)
- [ ] **Backend/API (M1: prefs + filtering)**:
  - [ ] `GET/PUT /api/me/streaming-prefs` → `{ region, providers[] }` (JWT).
  - [ ] (опц.) `GET /api/streaming/providers?region=...` (каталог провайдеров для пикера).
- [ ] **DB (M1)**:
  - [ ] `002_user_streaming_prefs.sql`: `user_streaming_prefs(user_id, region, providers jsonb, updated_at)`.
- [ ] **Frontend (M1)**:
  - [ ] UX: “Мои сервисы” в `/account` + (опц.) отдельная страница `/streaming`.
  - [ ] `StreamingPrefsService` (signals) + `MyServicesPicker` (provider chips) + `RegionPicker`.
  - [ ] Discover/Search: фильтр “Только на моих сервисах” + отображение provider chips на карточках.
- [ ] **Backend/API (M2: availability events)**:
  - [ ] `GET /api/availability/events?since=...` + (опц.) `POST /api/availability/track` (что отслеживать).
- [ ] **DB + Jobs (M2)**:
  - [ ] snapshots: `availability_snapshots(tmdb_id, region, providers jsonb, fetched_at)`.
  - [ ] events: `availability_events(... type added/leaving/changed ...)`.
  - [ ] cron: обновление watch-providers по списку отслеживания, diff → events.
- [ ] **Тесты**:
  - [ ] Server e2e: prefs GET/PUT auth + validation.
  - [ ] Unit: diff алгоритм snapshots→events (детерминизм).
  - [ ] FE: фильтр по моим сервисам (predicate + UI).

#### 5.2 Smart Alerts 2.0 (умные уведомления с правилами)
- [ ] **Backend/API (M1: rules + inbox feed)**:
  - [ ] CRUD: `GET/POST/PUT/DELETE /api/alert-rules`.
  - [ ] Inbox: `GET /api/notifications`, `POST /api/notifications/:id/read`.
  - [ ] (dev-only) `POST /api/alerts/run` (прогон правил вручную для разработки).
  - [ ] DTO минимально: `filters{minRating, genres, maxRuntime, languages, providerKeys}`, `channels{inApp, webPush, email, calendar}`, `quietHours{start,end,tz}`.
- [ ] **DB (M1)**:
  - [ ] `alert_rules(... filters jsonb, channels jsonb, quiet_hours jsonb ...)`.
  - [ ] `notifications(... payload jsonb, read_at, rule_id ...)`.
- [ ] **Frontend (M1)**:
  - [ ] `/notifications` → табы “Inbox / Rules”.
  - [ ] Rule Builder (chip-based clauses) + preview (“примерно N совпадений/нед”).
  - [ ] “Why this?” панель у нотификации (explain).
- [ ] **Delivery (M2)**:
  - [ ] WebPush: `POST /api/push/subscribe`, хранение `push_subscriptions`.
  - [ ] Email + digest: outbox таблица + worker/cron, “quiet hours”, weekly digest.
  - [ ] Calendar: `.ics` генерация для событий (или ссылкой на existing util).
- [ ] **Тесты**:
  - [ ] Unit: матчинг правил + quiet hours.
  - [ ] Server e2e: CRUD rules + read/unread inbox.
  - [ ] FE e2e: создать правило → увидеть item в inbox (через dev run endpoint).

#### 5.3 Movie Diary (журнал просмотров как у Letterboxd/Trakt)
- [ ] **Backend/API (M1: CRUD)**:
  - [ ] `GET /api/diary?from&to`, `POST/PUT/DELETE /api/diary/:id`.
  - [ ] Поля: `watchedAt`, `location`, `providerKey?`, `rating?`, `note?`, `tags?`.
- [ ] **DB (M1)**:
  - [ ] `diary_entries(id, user_id, tmdb_id, watched_at, location, provider_key, rating, note, tags[], created_at, updated_at)` + индексы.
- [ ] **Frontend (M1)**:
  - [ ] Роут `/diary` (timeline по дням/неделям).
  - [ ] “Log watch” bottom sheet / page: быстрый ввод (prefill из movie details / decision winner).
- [ ] **Stats + export/import (M2)**:
  - [ ] `GET /api/diary/stats?year=...` + `GET /api/diary/export?format=...`.
  - [ ] `POST /api/diary/import` (через общий import pipeline 5.7).
- [ ] **Тесты**:
  - [ ] Server e2e: CRUD + фильтры по датам.
  - [ ] FE: add/edit/delete entry; stats/empty state.

#### 5.4 Watch Progress (прогресс и состояния, проще чем у Trakt)
- [ ] **Backend/API (M1)**:
  - [ ] `GET /api/watch-state`, `PUT /api/watch-state/:tmdbId`, `DELETE /api/watch-state/:tmdbId`.
  - [ ] Статусы: `want|watching|watched|dropped|hidden` + (опц.) `progress{minutes|pct}`.
- [ ] **DB (M1)**:
  - [ ] `watch_state(user_id, tmdb_id, status, progress jsonb, updated_at)` PK `(user_id, tmdb_id)`.
- [ ] **Frontend (M1)**:
  - [ ] Quick actions единым набором: карточка/детали/списки (tap cycle + long-press picker).
  - [ ] Страница `/watchlist` с табами по статусам.
  - [ ] Merge-логика: server truth + optimistic UI + конфликт по `updatedAt`.
- [ ] **Bulk ops (M2)**:
  - [ ] `POST /api/watch-state/bulk` + UI массового “hide/want”.
- [ ] **Тесты**:
  - [ ] Unit: переходы статусов и merge.
  - [ ] e2e: действие на карточке отражается на `/watchlist` и в details.

#### 5.5 Decision Mode (“Что смотреть сегодня?”) — уникальный UX
- [ ] **Frontend-first (M1: solo)**:
  - [x] Роут `/decide` (“Tonight”): каркас + constraints MVP UI.
  - [x] Shortlist UI: Top 5 / Roulette + выбор победителя (frontend MVP).
  - [ ] Пресеты ограничений (weeknight/date night/family) + “use my services by default”.
  - [ ] Быстрые действия на кандидатах: hide / like / add to watchlist.
- [ ] **Backend/API (M1)**:
  - [ ] `POST /api/decision-sessions` (constraints + mode) → candidates.
  - [ ] `GET /api/decision-sessions/:id`, `POST /api/decision-sessions/:id/pick`.
- [ ] **DB (M1)**:
  - [ ] `decision_sessions`, `decision_candidates`, `decision_picks`.
- [ ] **Group voting (M2)**:
  - [ ] `POST /api/decision-sessions/:id/share` → share link.
  - [ ] Public view + anonymous votes (rate-limited) + “reveal winner”.
- [ ] **Тесты**:
  - [ ] FE e2e: constraints → winner → open movie.
  - [ ] API e2e: share link + voting flow.

#### 5.6 Collections & Taste Graph (списки как контент + граф вкуса)
- [ ] **Collections (M1: CRUD)**:
  - [ ] API: `GET/POST/PUT/DELETE /api/collections`, items CRUD.
  - [ ] DB: `collections`, `collection_items`.
  - [ ] FE: `/collections`, `/collections/:id`, editor, добавление фильма из details/search.
- [ ] **Auto-collections + taste (M2)**:
  - [ ] API: `GET /api/auto-collections` (computed из watch_state/diary/favorites).
  - [ ] API: `GET /api/taste/summary`, `GET /api/taste/similar-to?tmdbId=...`.
  - [ ] (опц.) кеш `taste_snapshots` nightly.
- [ ] **Тесты**:
  - [ ] e2e: создать список → добавить/удалить фильм.
  - [ ] Unit: весовые алгоритмы taste summary (устойчивость).

#### 5.7 Import & Sync (онбординг сильнее конкурентов)
- [ ] **Import pipeline (M1)**:
  - [ ] API: `POST /api/imports` (upload), `GET /api/imports/:id` (progress), `POST /api/imports/:id/apply`.
  - [ ] DB: `import_jobs` + (опц.) `import_job_rows` + `import_conflicts`.
  - [ ] Worker: parse → map → resolve TMDB ids (rate-limited) → preview.
  - [ ] FE: `/import` wizard + preview table + conflict resolver.
- [ ] **Export (M2)**:
  - [ ] API: `GET /api/exports?kind=...&format=csv|json` (diary/watchlist/ratings).
  - [ ] FE: “Export my data” в профиле + shareable ссылки на файлы (если нужно).
- [ ] **Тесты**:
  - [ ] Unit: парсеры CSV (generic + 1 популярный формат).
  - [ ] e2e: upload → preview → apply → данные появились в diary/watchlist.

#### 5.8 Explainable Recommendations (объяснимые рекомендации — доверие)
- [ ] **API (M1: explain + controls)**:
  - [ ] Расширить `GET /api/recommendations`: `{ items: [{ tmdbId, score, explain[] }] }`.
  - [ ] Action feedback: `POST /api/recommendations/feedback` (“more/less/hide”) или расширить `/api/feedback` структурированным reason.
- [ ] **DB**:
  - [ ] (минимум) переиспользовать `feedback`; (опц.) `recommendation_feedback` для “more/less”.
- [ ] **Frontend (M1)**:
  - [ ] Drawer “Why this?” на карточке/в списке.
  - [ ] Кнопки “More like this / Less like this / Hide” + мгновенная реакция UI.
- [ ] **Метрики (M2)**:
  - [ ] `GET /api/recommendations/metrics` (diversity/novelty/coverage) для отладки качества.
- [ ] **Тесты**:
  - [ ] Unit: explain generator (ограниченный размер, i18n-ready).
  - [ ] e2e: “Less like this” меняет выдачу на следующем запросе.

#### 5.9 Edition-aware + Releases Timeline (точность релизов/версий)
- [ ] **Release timeline (M1)**:
  - [ ] API: `GET /api/movies/:tmdbId/releases?region=...` (snapshot/cached).
  - [ ] Reminders: `POST/GET/DELETE /api/release-reminders` (type + window + channels).
  - [ ] FE: секция “Timeline” в details + список upcoming reminders в Inbox/Notifications.
- [ ] **DB + Jobs**:
  - [ ] `movie_releases` snapshots + `release_reminders`.
  - [ ] Cron: daily check → enqueue notifications (respect rules/quiet hours).
- [ ] **Edition-aware (M2)**:
  - [ ] API: `GET /api/movies/:tmdbId/editions` (пока эвристика/ручные метки).
  - [ ] DB: `movie_editions` + связь diary/watch_state с `edition_key` (если нужно).
- [ ] **Тесты**:
  - [ ] Unit: avoid double notify + window logic.
  - [ ] e2e: создать reminder → появляется в inbox (через time-travel/mock clock).

#### 5.10 Shareables (рост и «собирательность»)
- [ ] **Public profile (M1)**:
  - [ ] API: `GET/PUT /api/me/public-profile` + public `GET /api/u/:slug` (privacy-filtered).
  - [ ] DB: `public_profiles(slug, enabled, visibility, sections jsonb)`.
  - [ ] FE: `/u/:slug` + настройки приватности в профиле.
- [ ] **Share cards (M1)**:
  - [ ] FE renderer (HTML/CSS) + “Export to image” (client-only first).
  - [ ] Templates: top-10, month recap (diary), tonight shortlist.
- [ ] **Synthesis hub (M2)**:
  - [ ] FE: `/me` (единый хаб): watchlist + diary + alerts + recs + quick add.
  - [ ] Общий “movie actions” bottom sheet для всех поверхностей.
- [ ] **Тесты**:
  - [ ] e2e: public profile скрывает выключенные секции; unlisted доступен по ссылке.
  - [ ] snapshot: share card layout детерминирован (без прыжков).

#### 5.X Дизайн/UX (единая “Movie OS” стилистика для Итерации 5)
- [ ] **IA/Навигация (mobile-first, 5 вкладок максимум)**:
  - [x] `Discover` (поиск/лента), `Tonight` (Decision Mode), `Diary`, `Lists`, `Inbox` — навигация/роуты добавлены.
  - [ ] В профиле: My Services, Import/Export, Privacy/Share, Language/Region.
- [ ] **Единые интеракции (везде одинаково)**:
  - [ ] Quick actions (один набор): Status cycle + Like/Dislike + Alert + Log.
  - [ ] Bottom sheet / drawer для “More…” и “Why this?” (без разнобоя).
- [ ] **Rule Builder как главный паттерн**:
  - [ ] Chip-based clauses: trigger + constraints + channels + preview.
  - [ ] “Why” генерируется из тех же clause-объектов (переиспользование в inbox).
- [ ] **Компоненты, которые стоит вынести в shared**:
  - [x] `Button` variants (primary/secondary/ghost/icon/loading), `Card`, `Chip`, `BottomSheet`, `Toast`.
  - [x] `Section`, `SegmentedControl`, `FormField` (label/hint/error slots).
  - [ ] `Pill/Badge`.
- [ ] **Состояния**:
  - [ ] Skeleton loaders для списков и карточек; empty states всегда с CTA (“Add services”, “Create rule”, “Log first watch”, “Import history”).
  - [ ] Errors: коротко что сломалось + retry + контекст (“проверь регион/сервисы”).
- [ ] **A11y/качество**:
  - [ ] Контраст в dark theme для chips/badges, фокус‑кольца, touch targets ≥ 44px.
  - [ ] Жесты (swipe/long-press) только как enhancement: обязательны кнопки/клавиатура.

#### Portfolio (отдельный проект)
- [x] Создать отдельную папку проекта: `portfolio-site/` (заготовка: `README.md`, `index.html`).

#### Итерация 3.1 — Бесплатный кинотеатр (только легальные источники)

Цель: добавить **просмотр фильмов** через источники, которые можно использовать в **некоммерческих целях** (public domain / CC / официально бесплатные).

- [x] **Каталог public domain**: Internet Archive (collection `publicdomainmovies`) + поиск.
- [x] **Просмотр**: HTML5 `<video>` из прямого файла (если доступен MP4/WebM), с ссылкой на источник.
- [x] **Роут и навигация**: страница `/free` + пункт меню «Кинотеатр».
- [ ] **Расширить источники** (опционально):
  - [ ] Wikimedia Commons (WebM/OGV) для доп. контента с лицензией.
  - [ ] “Где посмотреть легально” через TMDB watch providers (с атрибуцией).

