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

### Идеи для следующих итераций (исторический блок — часть закрыта реализацией)
- [x] **Аутентификация и профили** — в продукте: NestJS JWT + `/account` (Firebase/Auth0 в этом репозитории не целевой MVP).
- [x] **Списки «хочу посмотреть» / прогресс** — watchlist + watch-state, избранное, дневник; чистая «история как у VOD» — backlog.
- [x] **Плеер** — трейлеры (YouTube) + `/free` (легальный просмотр); интеграция с NAS — backlog.
- [x] **Монетизация (минимум)** — донаты/promo в shell; расширения — зафиксированы как backlog (не в текущем milestone):
  - [x] Нативный промо‑блок с рекомендацией контента/подборок — **не делаем в текущем релизе**.
  - [x] Партнёрские ссылки на внешние подписки — **не делаем в текущем релизе**.
  - [x] Блок донатов / поддержка проекта (виджет в shell).

---

### Итерация 2 (backlog по запросу)
- [x] **Монетизация**: добавить виджет донатов в shell (`promo`).
- [x] **Плеер**: добавить «реальный» плеер для трейлеров (TMDB videos → YouTube embed).
- [x] **Аутентификация**: login/logout + профиль — NestJS JWT, Account, server sync.
- [x] **Персональные списки**:
  - [x] «Хочу посмотреть» / статусы — watchlist + watch-state (API + локально).
  - [x] «История просмотра» — diary + watched в watch-state; расширенный таймлайн — backlog.

---

### Итерация 3 — CORS fix + продающее портфолио + уникальный продукт

- [x] **CORS (dev)**: защититься от прямого вызова TMDB в dev и форсировать `/tmdb` proxy.
- [x] **Security/DX**: убрать TMDB API key из репозитория (ключ только через `public/env.js` / env vars).
- [x] **Портфолио-упаковка**: home/landing внутри приложения + витрина + “пруфы” компетенций.
- [x] **SEO (база)**: meta + OG/Twitter теги в `index.html`.
- [x] **Уведомления о релизах (MVP)**:
  - [x] Авторизация обязательна (профиль).
  - [x] Подписка на релиз фильма + выбор канала: in-app / web push / email / calendar (.ics).
  - [x] Встроить entrypoint из карточки фильма: действия “Follow release / Add to diary / Add to list” → через sheet + редиректы в Lists/Diary/Inbox.

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
- [x] **Extra**: починка DNS для TMDB (в т.ч. если `api.themoviedb.org` указывал на localhost) — зафиксировано; при проблемах — Quad9 / проверка hosts.
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
- [x] **Extra**: Email notifications — **SMTP** на API (`SMTP_*`, dev `POST /api/email/dev/send-test` при `DEV_EMAIL_SEND_ENABLED`); **cron напоминаний о релизах** — письмо при `channels.email` + `SMTP_HOST`; digest/alert-rules email outbox — **отложено**; in-app уже есть.
- [x] **Extra**: убрать строку «Каталог на данных TMDB · неофициальное приложение» из футера.
- [x] **Extra**: «Сервер + AI для просмотра» (Jellyfin/Plex + Ollama) — **отложено**, не в текущем scope репозитория.

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
- [x] **Embeddings pipeline** (v2 / отложено): кэш фич фильма из TMDB → эмбеддинг → запись в `movie_features.embedding`.
- [x] **ANN recommendations** (v2 / отложено): pgvector по профилю пользователя + фильтрация `dislike/hide` + диверсификация.
- [x] **Rerank (опционально, v2 / отложено)**: нейро‑ре‑ранжирование top‑K + объяснения.
- [x] **Notifications (v2 / частично)**:
  - [x] Email: **исходящий SMTP** (`nodemailer`, `SMTP_*`, dev `POST /api/email/dev/send-test` при `DEV_EMAIL_SEND_ENABLED` + JWT); **cron release reminders** — email при `channels.email` и настроенном `SMTP_HOST`; digest/alert-rules outbox + отдельный провайдер — **не в текущем milestone**.
  - [x] WebPush: хранение подписок на сервере (`POST /api/push/subscribe`, таблица `push_subscriptions`, `GET/DELETE`) + `GET /api/push/vapid-public`; **FE** синхронизирует Push-подписку с сервером при сохранении напоминания с каналом web push, если в API задан `VAPID_PUBLIC_KEY`; **отправка** с API: `web-push` + dev `POST /api/push/dev/send-self` (JWT, `DEV_PUSH_SEND_ENABLED`, полный `VAPID_SUBJECT` + ключи); **cron напоминаний о релизах** при `channels.webPush`; dev **`POST /api/alerts/run`** при включённом правиле с `channels.webPush` + VAPID — push с тем же текстом, что sample in-app; полноценный matcher по TMDB/cron для правил и digest email — **backlog**.

#### Итерация 4 — Workstreams (можно делать параллельно)

**A. Backend hardening (без влияния на ML/UX)**
- [x] Валидация конфигов на старте (schema) + убрать небезопасные fallback’и (`JWT_SECRET` обязателен).
- [x] CORS allowlist (без `origin: true`) + `helmet` + лимиты размера body.
- [x] Rate limiting / throttling для `/auth/*` и (опционально) остальных.
- [x] Единый формат ошибок (exception filter) + structured logging (request id).
- [x] Миграции: advisory lock, checksum/immutability, устойчивый путь до папки `migrations/`.
- [x] Привести API к единому контракту ответов (`{ ok, data, error }` или аналог) + убрать DELETE body (сделать `DELETE /favorites/:tmdbId`, `DELETE /subscriptions/:id`).

**B. Recommendations pipeline (pgvector) — v2 / отложено**
- [x] TMDB feature cache: endpoints/jobs для cast/crew/keywords + нормализация в `movie_features` — **не в текущем milestone**.
- [x] Embeddings: сервис + запись `movie_features.embedding` + ретраи — **не в текущем milestone**.
- [x] ANN: pgvector query (cosine) по профилю (like/favorites) + фильтрация `dislike/hide` — **не в текущем milestone**.
- [x] Explanations уровня жанр/актер/seed — **частично** в explain API рекомендаций (MVP); полный pipeline — **отложено**.
- [x] Тесты рекомендаций (блок-лист, холодный старт, детерминированность) — **отложено** вместе с v2 pipeline.

**C. DevOps / безопасность (репозиторий)**
- [x] Секреты: `movie-discovery/public/env.js` в `.gitignore`; ключ TMDB только локально/`env` — **ротация ключа** при компрометации вручную.
- [x] Compose reliability: healthchecks (`db` + `api`), `depends_on: service_healthy`, restart policy, env_file.
- [x] Docker hardening: non-root, `npm ci --omit=dev` для runtime, healthcheck.
- [x] CI: workflow на `movie-discovery/` и `server/` (lint/test/build) + `docker build` + secret scanning (gitleaks/trufflehog).
- [x] Корневой `README.md`: опциональные проверки `server` e2e и Playwright; `scripts/verify-all.*` — быстрый регресс (без e2e), для `server` тот же `lint:ci`, что в CI; описание **GitHub Actions** (`.github/workflows/ci.yml`: gitleaks, FE lint/test/build, server `lint:ci`/build/test, `docker build`; без e2e в CI).

**D. Frontend refactor (переиспользуемость, без конфликтов с backend)**
- [x] Убрать дублирование `language`: единый источник (интерцептор *или* `MovieService.baseParams()`), чтобы не было расхождений.
- [x] Выделить TMDB client helper: join URL, params, text→JSON parse, retry, единая обработка non-JSON.
- [x] Починить/убрать “мертвые” маршруты (`/favorites`, `/notifications`) — либо реализовать страницы, либо удалить редиректы/ключи навигации.
- [x] Упростить state layer: удалить неиспользуемые `store/facade` (переходим на сервисы + локальные сигналы).
- [x] Общий билдер TMDB image URLs (`/imgtmdb/*`) + единый `srcset/sizes`.
- [x] Дотянуть i18n: заменить хардкод строк в шаблонах на `i18n.t()` (details/card) + добавить ключи.

**E. Тестирование**
- [x] Server e2e: покрытие по доменам (`server/test/*.e2e-spec.ts`): auth, imports, alerts, movies, diary, …; полный matrix всех эндпоинтов — backlog.
- [x] Server: валидация Zod/DTO — точечно в e2e и unit; расширение negative cases — backlog.
- [x] Frontend: Vitest unit + Playwright e2e (`movie-discovery/e2e`); расширение smoke — backlog.

---

### Итерация 5 — Уникальный «собирательный» продукт (лучше аналогов)

Цель: объединить сильные стороны Letterboxd/Trakt (дневник, вкусы, социальность) + JustWatch (где смотреть) + IMDb/TMDB (масштаб) в один **workflow‑ориентированный** продукт: “что смотреть → где смотреть → когда смотреть → почему именно это”.

#### 5.1 Smart Streaming Hub (агрегация «где смотреть» под пользователя)
- [x] **Backend/API (M1: prefs + filtering)**:
  - [x] `GET/PUT /api/me/streaming-prefs` → `{ region, providers[] }` (JWT).
  - [x] (опц.) `GET /api/streaming/providers?region=...` (каталог провайдеров для пикера).
- [x] **DB (M1)**:
  - [x] `003_user_streaming_prefs.sql`: `user_streaming_prefs(user_id, region, providers jsonb, updated_at)`.
- [x] **Frontend (M1)**:
  - [x] UX: “Мои сервисы” в `/account` (frontend MVP, local storage).
  - [x] `StreamingPrefsService` (signals): region + providers list (frontend MVP).
  - [x] Provider picker: catalog search via `GET /api/streaming/providers?region=...` (best-effort).
  - [x] Movie details: подсветка провайдеров “My” + предпочтительный регион по умолчанию.
- [x] Discover/Search: фильтр “Только на моих сервисах” + отображение provider chips на карточках. (local)
- [x] **Backend/API (M2: availability events)**:
  - [x] `GET /api/availability/events?since=...` + `POST /api/availability/track` (что отслеживать).
  - [x] `POST /api/availability/ingest` — запись snapshot + diff → события для трекеров (для worker/cron).
- [x] **DB + Jobs (M2)**:
  - [x] snapshots: `availability_snapshots(tmdb_id, region, providers jsonb, fetched_at)`.
  - [x] events: `availability_events(... type added/leaving/changed ...)`.
  - [x] cron: фоновый sync (интервал + `AVAILABILITY_CRON_ENABLED`) → TMDB watch providers → ingest/diff → events.
- [x] **Тесты**:
  - [x] Server e2e: prefs GET/PUT auth + validation.
  - [x] Server e2e: availability track + ingest + events feed.
  - [x] Unit: diff алгоритм snapshots→events (детерминизм).
  - [x] FE: фильтр по моим сервисам (predicate + UI).

#### 5.2 Smart Alerts 2.0 (умные уведомления с правилами)
- [x] **Backend/API (M1: rules + inbox feed)**:
  - [x] CRUD: `GET/POST/DELETE /api/alert-rules`. (PUT via POST upsert)
  - [x] Inbox: `GET /api/notifications`, `POST /api/notifications/:id/read`.
  - [x] (dev-only) `POST /api/alerts/run` (вкл. через `DEV_ALERTS_ENABLED`).
  - [x] DTO минимально: `filters{minRating, genres, maxRuntime, languages, providerKeys}`, `channels{inApp, webPush, email, calendar}`, `quietHours{start,end,tz}`.
- [x] **DB (M1)**:
  - [x] `alert_rules(... filters jsonb, channels jsonb, quiet_hours jsonb ...)`.
  - [x] `notifications(... payload jsonb, read_at, rule_id ...)`.
- [x] **Frontend (M1)**:
  - [x] `/inbox`: feed + Rules CRUD (frontend MVP, local storage).
  - [x] “Why this?” панель у нотификации (frontend MVP, local).
  - [x] Rule Builder (chip-based clauses) + preview (“примерно N совпадений/нед”). (local)
- [x] **Delivery (M2 — частично)**:
  - [x] WebPush: `POST /api/push/subscribe` + таблица `push_subscriptions` + `GET /api/push/subscriptions`, `DELETE /api/push/subscriptions/:id` + `GET /api/push/vapid-public` + **исходящая** отправка (`web-push`, dev `POST /api/push/dev/send-self` при `VAPID_*`); **фоновая** — release reminders cron при `channels.webPush`; dev **alerts/run** — push если есть enabled-правило с `webPush`; автоматический matcher правил по каталогу + digest — **backlog** (M1 inbox для правил — по-прежнему in-app + dev sample).
  - [x] Email: dev `POST /api/email/dev/send-test` (JWT, `DEV_EMAIL_SEND_ENABLED`); **FE Account** — кнопка smoke-теста письма (Server JWT); **cron release reminders** — plain-text при `channels.email` + `SMTP_*`; digest/outbox для правил — **не в текущем milestone**.
  - [x] Calendar: серверная `.ics` для правил — **не в текущем milestone** (клиентский .ics для подписок на релиз — по-прежнему в фронте где есть).
- [x] **Тесты**:
  - [x] Unit: матчинг правил + quiet hours.
  - [x] Server e2e: CRUD rules + read/unread inbox.
  - [x] FE e2e: создать правило → увидеть item в inbox (через dev run endpoint).

#### 5.3 Movie Diary (журнал просмотров как у Letterboxd/Trakt)
- [x] **Backend/API (M1: CRUD)**:
  - [x] `GET /api/diary?from&to`, `POST/PUT/DELETE /api/diary/:id`.
  - [x] Поля: `watchedAt`, `location`, `providerKey?`, `rating?`, `note?`, `tags?`.
- [x] **DB (M1)**:
  - [x] `diary_entries(id, user_id, tmdb_id, watched_at, location, provider_key, rating, note, tags[], created_at, updated_at)` + индексы.
- [x] **Frontend (M1)**:
  - [x] Роут `/diary`: список записей (frontend MVP, local storage).
  - [x] “Log watch” bottom sheet: create/edit/delete (frontend MVP).
- [x] **Stats + export/import (M2)**:
  - [x] `GET /api/diary/stats?year=...`.
  - [x] `GET /api/diary/export?format=csv|json` (+ optional `year`).
  - [x] `POST /api/diary/import` (через общий import pipeline 5.7).
- [x] **Тесты**:
  - [x] Server e2e: CRUD + фильтры по датам.
  - [x] FE: add/edit/delete entry; stats/empty state.

#### 5.4 Watch Progress (прогресс и состояния, проще чем у Trakt)
- [x] **Backend/API (M1)**:
  - [x] `GET /api/watch-state`, `PUT /api/watch-state/:tmdbId`, `DELETE /api/watch-state/:tmdbId`.
  - [x] Статусы: `want|watching|watched|dropped|hidden` + (опц.) `progress{minutes|pct}`.
- [x] **DB (M1)**:
  - [x] `watch_state(user_id, tmdb_id, status, progress jsonb, updated_at)` PK `(user_id, tmdb_id)`.
- [x] **Frontend (M1)**:
  - [x] Quick action на карточке: cycle status (frontend MVP, local storage).
  - [x] Страница `/watchlist` с табами по статусам (frontend MVP, local storage).
  - [x] Merge-логика: server truth + optimistic UI + конфликт по `updatedAt`. (util + tests)
- [x] **Bulk ops (M2)**:
  - [x] `POST /api/watch-state/bulk` + UI массового “hide/want”.
- [x] **Тесты**:
  - [x] Unit: переходы статусов и merge.
  - [x] e2e: действие на карточке отражается на `/watchlist` и в details.
  - [x] Server e2e: CRUD watch-state (auth + validation).

#### 5.5 Decision Mode (“Что смотреть сегодня?”) — уникальный UX
- [x] **Frontend-first (M1: solo)**:
  - [x] Роут `/decide` (“Tonight”): каркас + constraints MVP UI.
  - [x] Shortlist UI: Top 5 / Roulette + выбор победителя (frontend MVP).
  - [x] Пресеты ограничений (weeknight/date night/family) + “use my services by default”.
  - [x] Быстрые действия на кандидатах: hide / like / add to watchlist.
- [x] **Backend/API (M1)**:
  - [x] `POST /api/decision-sessions` (constraints + mode) → candidates.
  - [x] `GET /api/decision-sessions/:id`, `POST /api/decision-sessions/:id/pick`.
- [x] **DB (M1)**:
  - [x] `decision_sessions`, `decision_candidates`, `decision_picks`.
- [x] **Group voting (M2)**:
  - [x] `POST /api/decision-sessions/:id/share` → share link.
  - [x] Public view + anonymous votes (rate-limited) + “reveal winner”.
- [x] **Тесты**:
  - [x] FE e2e: constraints → winner → open movie.
  - [x] API e2e: share link + voting flow.

#### 5.6 Collections & Taste Graph (списки как контент + граф вкуса)
- [x] **Collections (M1: CRUD)**:
  - [x] API: `GET/POST/DELETE /api/collections`, items CRUD. (PUT via POST upsert)
  - [x] DB: `collections`, `collection_items`.
  - [x] FE: `/collections` list + CRUD + items (frontend MVP, local storage).
- [x] **Auto-collections + taste (M2)**:
  - [x] API: `GET /api/auto-collections` (computed из watch_state/diary/favorites).
  - [x] API: `GET /api/taste/summary`, `GET /api/taste/similar-to?tmdbId=...`.
  - [x] (опц.) кеш `taste_snapshots` nightly — **не делаем в MVP** (backlog).
- [x] **Тесты**:
  - [x] Server e2e: создать список → добавить/удалить фильм.
  - [x] Unit: весовые алгоритмы taste summary (устойчивость).

#### 5.7 Import & Sync (онбординг сильнее конкурентов)
- [x] **Import pipeline (M1)**:
  - [x] API: `POST /api/imports` (upload), `GET /api/imports/:id` (progress).
  - [x] API: `POST /api/imports/:id/apply`.
  - [x] API: `POST /api/imports/:id/preview` → parse → `import_job_rows` (MVP).
  - [x] API: `GET /api/imports/:id/rows?offset&limit` (preview rows for FE).
  - [x] API: `GET /api/imports/:id/conflicts?offset&limit` (preview conflicts for FE).
  - [x] API: `POST /api/imports/:id/rows/:rowN/resolve` (edit mapped/status for wizard).
  - [x] Apply: использовать `import_job_rows.mapped` после preview (под /import wizard).
  - [x] DB: `import_jobs`.
  - [x] DB: `import_job_rows` + `import_conflicts`.
  - [x] Preview: conflict detection MVP (watch_state) → `import_conflicts` + row status=conflict.
  - [x] Conflicts: возвращать `rowN` (когда возможно), чтобы FE мог открыть resolve сразу из conflicts.
  - [x] Resolve: записывать `import_conflicts.resolution` при выборе решения (watch_state MVP).
  - [x] Worker: parse → map → resolve TMDB ids (rate-limited) → preview.
  - [x] FE: `/import` wizard (MVP): create → preview → rows/conflicts list (+pager) → resolve row → apply (JWT token input).
  - [x] FE: conflict quick actions (Use server / Use incoming) for faster resolving.
  - [x] FE: conflict quick actions do one-click resolve (no JSON editing).
  - [x] FE: conflicts UI shows server/incoming/resolution payloads (debuggable).
  - [x] FE: hide resolved conflicts toggle + persisted preference (cleaner triage).
- [x] **Export (M2)**:
  - [x] API: `GET /api/exports?kind=diary|watch_state|favorites&format=csv|json` (MVP).
  - [x] FE: “Export my data” в профиле (MVP: JWT token input + download CSV/JSON).
- [x] **Тесты**:
  - [x] Unit: парсеры CSV (generic + 1 популярный формат).
  - [x] e2e (server): upload → apply → данные появились в diary.
  - [x] e2e (server): upload → apply → данные появились в watch-state.
  - [x] e2e (server): upload → apply → данные появились в favorites.
  - [x] e2e (server): upload → apply → diary CSV (Letterboxd) импортируется.
  - [x] e2e (server): upload → preview → status=preview + rows сохранены.
  - [x] e2e (server): upload → preview → apply → данные появились в watch-state.

#### 5.8 Explainable Recommendations (объяснимые рекомендации — доверие)
- [x] **API (M1: explain + controls)**:
  - [x] Расширить `GET /api/recommendations`: `{ items: [{ tmdbId, score, explain[] }] }`.
  - [x] Action feedback: `POST /api/recommendations/feedback` (“more/less/hide”) (через `feedback` table + reason).
- [x] **DB**:
  - [x] (минимум) переиспользовать `feedback`; (опц.) `recommendation_feedback` для “more/less”.
- [x] **Frontend (M1)**:
  - [x] “Why this?” панель для рекомендаций (frontend MVP).
  - [x] “Less like this / Hide” (frontend MVP, local).
- [x] **Метрики (M2)**:
  - [x] `GET /api/recommendations/metrics` (diversity/novelty/coverage) для отладки качества.
- [x] **Тесты**:
  - [x] Unit: explain generator (ограниченный размер, i18n-ready).
  - [x] Server e2e: “Less/Hide” меняет выдачу на следующем запросе.

#### 5.9 Edition-aware + Releases Timeline (точность релизов/версий)
- [x] **Release timeline (M1)**:
  - [x] API: `GET /api/movies/:tmdbId/releases?region=...` (snapshot/cached, Postgres `movie_release_snapshots` + TTL `MOVIE_RELEASES_CACHE_TTL_MS`).
  - [x] Reminders: `POST/GET/DELETE /api/release-reminders` (type + window + channels; Postgres `release_reminders`).
  - [x] FE: секция “Timeline” на movie details + форма server reminders (чекбоксы in-app / Web Push / **email** → API `channels.*`); в Inbox — блок «Release reminders (server)» при Load server feed (нужен Server JWT).
- [x] **DB + Jobs**:
  - [x] Postgres: `movie_release_snapshots` (кэш TMDB `release_dates`).
  - [x] Postgres: `release_reminders` (правила: `reminder_type` + `window` + `channels`; `last_notified_at` для будущего cron).
  - [x] Cron: периодическая проверка → `notifications` (тип `release`) из кэша `movie_release_snapshots` + `RELEASE_REMINDERS_REGION`; при `channels.webPush`/`channels.email` — исходящие Web Push / SMTP; опц. `RELEASE_REMINDERS_CRON_ENABLED` / `RELEASE_REMINDERS_CRON_INTERVAL_MS`. Dev: `POST /api/release-reminders/dev/tick` (+ `todayYmd` при `DEV_ALERTS_ENABLED`).
  - [x] Quiet hours / согласование с `alert_rules` (MVP): cron **не** ставит in-app release reminder, если `now` попадает в quiet window; effective quiet hours — у самого свежего enabled правила с non-null `quiet_hours` (`isInQuietHours`, UTC); без обновления `last_notified_at` (повтор вне окна). Dev/tick: опционально `nowIso`.
- [x] **Edition-aware (M2, MVP)**:
  - [x] API: `GET /api/movies/:tmdbId/editions` — эвристика по типам TMDB `release_dates` из snapshot + merge с ручными строками `movie_editions` (по `edition_key`).
  - [x] DB: `movie_editions(tmdb_id, edition_key, label, sort_order, meta)`; связь `edition_key` в `diary`/`watch_state` — **backlog** (по необходимости).
- [x] **Тесты**:
  - [x] Unit: window / avoid double notify (same calendar day) — `release-reminders-window.util`.
  - [x] Unit: парсинг даты релиза из snapshot — `release-dates-from-snapshot.util`.
  - [x] Unit: эвристика editions — `movie-editions-from-snapshot.util`.
  - [x] e2e (server): `GET /movies/:id/releases` (auth + cache hit; 503 без TMDB key).
  - [x] e2e (server): `GET /movies/:id/editions` (после releases: heuristic keys).
  - [x] e2e (server): `POST/GET/DELETE /release-reminders` (auth + validation).
  - [x] e2e (server): `dev/tick` + `todayYmd` → уведомление в `GET /notifications` (без повтора в тот же день); только `channels.email` без `SMTP_HOST` в тесте → `enqueued` 0.

#### 5.10 Shareables (рост и «собирательность»)
- [x] **Public profile (M1)**:
  - [x] API: `GET/PUT /api/me/public-profile` + public `GET /api/u/:slug` (privacy-filtered: только `enabled` + `visibility` в `unlisted|public`; секции из `sections`).
  - [x] DB: `public_profiles` (миграция `015_public_profiles.sql`: slug, enabled, visibility, sections jsonb).
  - [x] FE: маршрут `/u/:slug` + блок настроек в Account (Server JWT): slug, enabled, visibility, секции favorites/diary/watchlist.
- [x] **Share cards (M1)**:
  - [x] FE renderer (HTML/CSS) + “Export to image” (client-only first, html2canvas → PNG).
  - [x] Templates: top-10, month recap (diary), tonight shortlist (кандидаты из сессии после «Собрать shortlist» на Tonight).
- [x] **Synthesis hub (M2)**:
  - [x] FE: `/me` (единый хаб): watchlist + diary + Inbox (счётчик правил) + recs + quick add (`?q=` на главной).
  - [x] Общий `MovieActionsSheet`: статус watchlist, избранное, дневник (`logTitle`/`logTmdbId`), детали; подключён на Discover (рекомендации + random) и `/me`.
- [x] **Тесты**:
  - [x] e2e (server): публичный `GET /u/:slug` при unlisted + секции; `private` → 404; конфликт slug → 409.
  - [x] Unit (FE): детерминированный порядок строк share card (top10 / month recap / tonight) + стабильный `shareCardContentSnapshot`.

#### 5.X Дизайн/UX (единая “Movie OS” стилистика для Итерации 5)
- [x] **IA/Навигация (mobile-first, 5 вкладок максимум)**:
  - [x] `Discover` (поиск/лента), `Tonight` (Decision Mode), `Diary`, `Lists`, `Inbox` — навигация/роуты добавлены.
  - [x] В профиле: My Services, Import/Export, Language/Region (MVP: сервисы `#account-streaming`, импорт в блоке «Данные», язык TMDB — селектор в шапке; вход в хаб `/me` из Account).
  - [x] В профиле: Privacy/Share — публичный профиль (server) + `/u/:slug` (MVP).
- [x] **Единые интеракции (везде одинаково)**:
  - [x] Quick actions (один набор): цикл статуса watchlist + избранное + like/dislike + локальная подписка на релиз + дневник — в `MovieActionsSheet` (Discover + `/me`).
  - [x] Bottom sheet для действий с фильмом (`MovieActionsSheet`, MVP на Discover + `/me`); «Why this?» — отдельная панель на рекомендациях.
- [x] **Rule Builder как главный паттерн** (MVP):
  - [x] Chip-based clauses: trigger + constraints + channels + preview (MVP: chips для genres/langs/providers в rule sheet + Preview по popular sample).
  - [x] “Why” из тех же полей, что редактор правил: `inboxExplainFromRuleClauses` + превью в sheet, карточки rules, sample в `addSample` (первое enabled rule или demo).
- [x] **Компоненты, которые стоит вынести в shared**:
  - [x] `Button` variants (primary/secondary/ghost/icon/loading), `Card`, `Chip`, `BottomSheet`, `Toast`.
  - [x] `Section`, `SegmentedControl`, `FormField` (label/hint/error slots).
  - [x] `Pill/Badge`.
  - [x] `SkeletonLines` (shimmer-строки для загрузки списков).
- [x] **Состояния** (MVP):
  - [x] Skeleton: `/me` recommendations (`app-skeleton-lines`); empty states с CTA на `/me` (watchlist, diary, recs).
  - [x] Errors + retry: Inbox server JWT block (`Retry` → повторная загрузка ленты); `/me` recs (`common.retry`).
- [x] **A11y/качество** (MVP):
  - [x] Фокус‑кольца глобально (`:focus-visible`); shell nav — явный `focus-visible` + touch targets ≥44px; chips — min-height 44px.
  - [x] Жесты только как enhancement: основной путь — кнопки/клавиатура (без обязательных swipe/long-press в MVP).

---

### Итерация 6 — Social (Friends + Chats + Совместные рекомендации) — **backlog / vNext**

Цель: добавить “социальный слой” уровня Letterboxd/Trakt и “movie night” сценарии: **дружба**, **чаты**, **совместный выбор фильма** и **совместные рекомендации** для 2 пользователей и групп **5–10**.

Текущее состояние (что уже есть как фундамент):
- [x] **Users + JWT**: `users`, auth endpoints (`/api/auth/*`), `@CurrentUser()` (server).
- [x] **Public profile**: `public_profiles` + `GET /api/u/:slug` (server) — база для social identity.
- [x] **“Feed” паттерн**: `notifications` + list/read endpoints — можно переиспользовать под chat/mentions.
- [x] **Share-token паттерн**: decision sessions имеют `share_token` + public read/vote endpoints — можно переиспользовать под invite links.
- [x] **Push infra**: `push_subscriptions` + delivery service (опционально для “new message”).

#### 6.1 Social graph (дружба / блокировки / приватность)
- [x] **DB (M1)** — добавить таблицы:
  - [x] `friend_requests(id, from_user_id, to_user_id, status, created_at, decided_at)` (status: pending/accepted/declined/cancelled).
  - [x] `friendships(user_id_a, user_id_b, created_at)` (invariant: a<b, unique).
  - [x] `user_blocks(blocker_user_id, blocked_user_id, created_at)` (hard deny).
  - [x] (опц.) `user_privacy_settings(user_id, allow_dm_from, allow_invites_from, …)` (M2).
- [x] **API (M1)**:
  - [x] `POST /api/friends/requests` (по `toUserId` или `slug`).
  - [x] `POST /api/friends/requests/:id/accept|decline|cancel`.
  - [x] `GET /api/friends` (list).
  - [x] `POST /api/blocks` / `DELETE /api/blocks/:userId`.
- [x] **Frontend (M1)**:
  - [x] Search/find users by `slug` (через `GET /api/u/:slug` + authed endpoint для “lookup user id”).
  - [x] Friends list + requests inbox (минимальный UI).
- [x] **Security**:
  - [x] Rate limits на friend requests; защита от enumeration; запрет self‑requests; учитывать `user_blocks`.

#### 6.2 Chats (DM + групповые чаты) — без WebSockets в MVP
Пояснение: сейчас в сервере нет WebSockets/SSE, зато есть рабочие паттерны “events since …” и `notifications`. Для MVP быстрее и проще: **DB + polling**.

- [x] **DB (M1)**:
  - [x] `conversations(id, kind dm|group, title?, created_by, created_at)`
  - [x] `conversation_members(conversation_id, user_id, role, joined_at, left_at?)`
  - [x] `messages(id, conversation_id, sender_user_id, body, created_at)`
  - [x] `conversation_reads(conversation_id, user_id, last_read_at)` (вместо per‑message receipts в MVP)
- [x] **API (M1)**:
  - [x] `POST /api/chat/conversations` (dm: by userId; group: title + memberIds).
  - [x] `GET /api/chat/conversations` (список + unread count).
  - [x] `GET /api/chat/messages?conversationId=...&since=...&limit=...` (инкрементальная загрузка)
  - [x] `POST /api/chat/messages` (send)
  - [x] `POST /api/chat/conversations/:id/read` (update `last_read_at`)
  - [x] Invite links (опц. M2): `POST /api/chat/conversations/:id/invite` → `token`; public `POST /api/public/chat/invites/:token/join`
- [x] **Delivery/notifications (M1)**:
  - [x] На входящее сообщение: запись в `notifications` + (опц.) Web Push (если VAPID настроен).
- [x] **Frontend (M1)**:
  - [x] Страница “Chats”: список диалогов, экран сообщений, polling по `since`.
  - [x] DM из public profile / friends list.
- [x] **Модерация/абьюз (минимум)**:
  - [x] Ограничение длины сообщения, throttling, блокировки (`user_blocks`), “report” — backlog.

#### 6.3 Совместные рекомендации (2 пользователя) + “movie night” UX
Цель: рекомендовать фильм, который **понравится обоим**, даже если вкусы разные.

- [x] **Signals (M1)**:
  - [x] Использовать `favorites` + `feedback` (like/dislike/hide) + исключать просмотренное (`watch_state=watched`, `diary_entries`).
  - [x] “Hard no”: если кто-то поставил `hide/dislike` — исключать из совместной выдачи (MVP).
- [x] **Candidate expansion (M1/M2)**:
  - [x] MVP: TMDB‑based expansion (movie/{id}/recommendations по seeds каждого участника).
  - [x] M2: embedding-based expansion через `taste/similar-to` (pgvector) — когда pipeline будет готов.
- [x] **Aggregation strategies (M1)**:
  - [x] Default: mean score + penalty “least misery” (не рекомендовать то, что одному сильно не зайдёт).
  - [x] Explain payload: “почему это подходит вам обоим” (top signals per user, approvals count).
- [x] **API (M1)**:
  - [x] `POST /api/recommendations/joint` body `{ memberUserIds[], strategy?, constraints? }`
  - [x] `POST /api/recommendations/joint/feedback` (опц.; либо reuse `/api/feedback` с `reason="group:..."`)
- [x] **Frontend (M1)**:
  - [x] Экран “Совместный выбор”: выбрать друга → получить список → “Why this?” на карточке.

#### 6.4 Рекомендации для группы (5–10)
Цель: “компания друзей” → список, который будет **достаточно хорош для всех**, без деградации качества.

- [x] **Group model (M1/M2)**:
  - [x] Ad‑hoc: одноразовый “run” по списку участников (по invite link).
  - [x] Persistent: `groups` + `group_members` + сохранение run’ов — (M2).
- [x] **Aggregation (M1)**:
  - [x] Approval/Borda как базовый ранжирующий механизм (устойчив при 5–10).
  - [x] Fairness: ограничение, чтобы в top‑N не было “вкуса одного человека” (простые квоты/ротация).
- [x] **UX (M1)**:
  - [x] Генерация shortlist + групповое голосование (можно переиспользовать decision sessions + public voting).
  - [x] Режим “avoid disasters”: least‑misery threshold.
- [x] **Тесты (MVP)**:
  - [x] Unit: агрегация/фильтры, детерминизм.
  - [x] Server e2e: доступы участников, join token, запрет блокированных, read model.

#### 6.5 Reviews & Ratings (оценки, отзывы, спойлеры, цитаты) — **backlog**
Цель: дать пользователям возможность **оценивать** фильмы и писать **отзывы** (публичные/по друзьям), не ломая UX спойлерами.

Текущее состояние:
- [x] Diary entries уже имеют `rating` + `note` (server `diary_entries.rating/note` + local diary в FE), но это **не публичные отзывы** и без обсуждений.
- [x] Есть `public_profiles` (slug/visibility/sections) и `notifications` (feed + read/unread) — можно расширять под social activity.
- [x] В UI уже используется паттерн `<details><summary>…</summary>…</details>` — удобно для spoiler blocks.

- [x] **DB (M1)**:
  - [x] `movie_reviews(id, user_id, tmdb_id, rating smallint null, title text null, body text not null, visibility public|friends|private, has_spoilers boolean, created_at, updated_at)`
  - [x] `review_quotes(id, review_id, quote text, source text null, is_spoiler boolean, sort_order int)` (цитаты как отдельные блоки)
  - [x] `review_spoiler_blocks(id, review_id, title text null, body text, sort_order int)` (спойлерные секции отдельно от основного текста)
  - [x] `review_likes(review_id, user_id, created_at)` (опц. M2, “полезно”)
  - [x] `review_comments(id, review_id, user_id, body text, created_at)` (опц. M2)

- [x] **API (M1)**:
  - [x] `POST/PUT/DELETE /api/reviews/:id` (CRUD, JWT)
  - [x] `GET /api/movies/:tmdbId/reviews?sort=recent|rating&visibility=public|friends` (пагинация)
  - [x] `GET /api/users/:userId/reviews` (для профилей; доступ по visibility)
  - [x] (M2) `POST /api/reviews/:id/like`, `POST /api/reviews/:id/comments`

- [x] **Frontend (M1)**:
  - [x] Movie details: секция “Отзывы” (list + compose/edit)
  - [x] Композер отзыва: rating + текст + **спойлерные блоки** (collapsible `<details>`) + **цитаты** (отдельные блоки)
  - [x] На рендере: body как plain text (без HTML), spoiler blocks скрыты до клика, quotes выделены стилем
  - [x] На public profile: “Recent reviews” секция (включается в `sections`)

- [x] **Anti-spoiler UX / безопасность (M1)**:
  - [x] Без markdown/HTML в MVP: хранить и рендерить как plain text + структурированные blocks (spoiler/quote) → нет XSS
  - [x] Rate limit на создание/комменты, длины текста, минимальные правила модерации (report — backlog)
  - [x] Notifications: “new comment / like” → запись в `notifications` (M2)

#### 6.6 IA/Onboarding (подсказки в каждом блоке + объединение вкладок) — **backlog**
Цель: чтобы пользователь **не “читал мысли разработчика”**. В каждой вкладке/секции есть:
- [x] 1 строка **для чего этот блок**
- [x] 1 строка **как им пользоваться (следующий шаг)**
- [x] (опц.) `<details>` “Почему/как работает” для продвинутых

##### 6.6.1 Подсказки по вкладкам (что сейчас делают)
- [x] **Сегодня (`/decide`)**: Decision Mode → собрать shortlist из кандидатов, применить простые ограничения, выбрать победителя (и/или проголосовать по share‑link).
- [x] **Дневник (`/diary`)**: журнал просмотров → добавить запись “смотрел(а)” с датой/локацией/оценкой/тегами; дальше — статистика и экспорт.
- [x] **Списки (`/collections`)**: пользовательские коллекции (папки) → собрать “топ‑10”, “в дорогу”, “с детьми” и т.п. (сейчас: manual items).
- [x] **Входящие (`/inbox`)**: “умные уведомления” → локальный feed + rules; опционально server feed/notifications/reminders при подключении.
- [x] **Discover (главная/поиск)**: purpose/instruction для блоков (сейчас в кино, рекомендации, случайная подборка, избранное, подписки) + i18n.

##### 6.6.2 Объединение пересекающегося функционала (IA)
- [x] **Lists ↔ Watchlist**: объединить в одну зону “Списки” (внутри: таб “Статусы” + “Коллекции”), `/watchlist` оставить как алиас/редирект.
- [x] **Inbox ↔ Notifications**: сделать Inbox единым центром уведомлений:
  - [x] release subscriptions management (перенесено в Inbox, `/inbox/subscriptions`)
  - [x] server notifications feed
  - [x] rules editor
  - [x] `/notifications` оставить как алиас/редирект на Inbox‑секцию.

##### 6.6.3 UX‑шаблон подсказок (реюз существующих компонентов)
- [x] Пустые состояния: `EmptyStateComponent` (title + instruction + CTA).
- [x] Формы: `FormFieldComponent` hint/error.
- [x] Продвинутые пояснения: native `<details>/<summary>` (уже используется в Inbox/import).
- [x] i18n‑конвенция: `<feature>.<block>.purpose` + `<feature>.<block>.instruction` (+ `.emptyTitle/.emptyInstruction`).

##### 6.6.4 Discover блоки (главная) — upcoming/скорые релизы
- [x] Добавить блок **“Скоро выйдет”** (TMDB upcoming): все фильмы с датой релиза в будущем, сортировка по `release_date` ASC (ближайшие сверху).
- [x] На главной: компактный вид (1–2 строки) + expand + переход на отдельную страницу `/upcoming`.
- [x] На странице `/upcoming`: полный список (paging/infinite scroll), без “исчезания” элементов от лайков (снимок на момент загрузки).

#### 6.7 Account UX (user‑friendly, без токенов) — **backlog**
Цель: `/account` как “профиль + подключения + приватность + данные”, без ручной работы с JWT/секретами.

Текущее состояние (проблемы):
- [x] Паста JWT, dev‑email smoke test и экспорт/импорт перемешаны в “основной” UI.
- [x] Концептуально две аутентификации: local FE auth и server JWT.

План (милестоуны):
- [x] **M1 (FE‑only)**: перестроить страницу на блоки “Profile / Connections / Data & Privacy / Advanced”; dev‑утилиты и raw JWT спрятать в Advanced.
- [x] **M2 (FE + server auth endpoints уже есть)**: “Connect to server” через `POST /api/auth/login`/`register` + silent storage токена + `GET /api/auth/me` для статуса (без textarea).
- [x] **M3**: streaming prefs sync как progressive enhancement (local‑first → server‑sync при подключении).
- [x] **M4**: Notifications hub: Web Push connect/disconnect (VAPID) + user‑grade email setup (не dev‑endpoint).
  - [x] Web Push connect/disconnect (VAPID): UI + subscribe/unsubscribe flow.
  - [x] Email setup (user‑grade, не dev‑endpoint).

#### 6.8 Персональная страница пользователя + кастомные “луки” (темы/оформление) — **backlog**
Цель: дать пользователю “домик” в сервисе — **вкус, планы и мысли**, которыми приятно делиться, и сделать интерфейс **настраиваемым под себя** (layout/фон/шрифты). Монетизация: “создать свой лук” — за символический донат, при этом оформление публичной страницы — бесплатно.

##### 6.8.1 Публичная страница (бесплатно)
- [x] **User story**: “Хочу показать друзьям, что люблю/что планирую/что думаю” → ссылка на страницу профиля.
- [x] **Профиль: блоки**:
  - [x] “О себе” (короткий текст, опц. ссылки)
  - [x] “Сейчас смотрю / планирую” (watchlist/diary snippets)
  - [x] “Избранное” (already есть секция)
  - [x] “Заметки/мысли” (короткие посты: мини‑заметки)
- [x] **DB (M1)**:
  - [x] `user_profile_settings(user_id, display_name, bio, avatar_url, links jsonb, created_at, updated_at)`
  - [x] `user_posts(id, user_id, body text, visibility public|friends|private, created_at, updated_at)` (короткие мысли)
  - [x] (опц.) `user_plans(id, user_id, tmdb_id, note text null, visibility ..., created_at)` (если хотим отдельный “планы” список, иначе reuse watchlist/collections)
- [x] **API (M1)**:
  - [x] `GET /api/users/:id/profile` (public view, с учётом visibility)
  - [x] `PUT /api/me/profile` (edit)
  - [x] `GET /u/:slug` (public page) — расширить текущую `public_profiles` модель новыми секциями
  - [x] `POST/PUT/DELETE /api/me/posts` (CRUD постов)
- [x] **Frontend (M1)**:
  - [x] Редактор профиля в `/account` (Profile): имя, био, аватар, ссылки, переключатели видимости секций
  - [x] На `/u/:slug`: аккуратная страница “визитка” + список постов + избранное/планы
- [x] **Safety/anti‑abuse (M1)**:
  - [x] Plain text only, лимиты длины, rate limit на постинг, report/moderation — backlog

##### 6.8.2 “Луки” интерфейса (для себя) + библиотека тем
- [x] **Идея**: пользователь выбирает внешний вид сайта “под себя” и может переключаться между сохранёнными наборами.
- [x] **Что настраиваем (M1)**:
  - [x] Layout “арт‑панель”: картинка слева / справа / под контентом / в шапке; либо фон/градиент вместо картинки
  - [x] Цветовая схема: базовый акцент + варианты подложек (без ломания контраста)
  - [x] Типографика: 2–3 размера базового шрифта + line‑height (без “микро‑ползунков” в MVP)
  - [x] Переключение: light/dark + “Мои луки”
- [x] **Хранение**:
  - [x] Local‑first: `localStorage` (мгновенно и без аккаунта)
  - [x] При авторизации: sync на сервер (у пользователя один список луков на все устройства)
- [x] **DB/API (M1/M2)**:
  - [x] `user_looks(id, user_id, name, config jsonb, is_default boolean, is_paid boolean, created_at)`
  - [x] `GET/POST/PUT/DELETE /api/me/looks` + `POST /api/me/looks/:id/set-default`
- [x] **Frontend (M1)**:
  - [x] `/account` → “Оформление”: список луков, превью, сделать активным, редактировать, удалить
  - [x] “Мой лук сейчас” быстрый переключатель (dropdown) в шапке
- [x] Unit tests: `LooksService` (lock/unlock + CRUD + safe storage load)
- [x] Playwright: header look selector persists + updates CSS vars

##### 6.8.3 Монетизация: “создать свой лук” за символический донат (без токсичности)
- [x] **Принцип**: базовые темы и публичная страница — бесплатно; платное — “персональная кастомизация” и/или “премиум‑скины”.
- [x] **MVP оплаты (M1)**:
  - [x] В UI: “Создать свой лук” → кнопка “Поддержать проект и открыть редактор”
  - [x] На первом этапе: ручной unlock (код/флаг в профиле) или внешняя ссылка на донат‑платформу → “я оплатил” (pending review) — без интеграции платежей
- [x] **M2**: полноценная интеграция (Stripe/Boosty/Patreon) + webhooks → автоматический unlock.

#### Portfolio (отдельный проект)
- [x] Создать отдельную папку проекта: `portfolio-site/` (заготовка: `README.md`, `index.html`).
- [x] Корневой `README.md` репозитория — оглавление монорепо (`movie-discovery/`, `server/`, Compose, `verify-all`); портфолио ссылается на него.

#### Итерация 3.1 — Бесплатный кинотеатр (только легальные источники)

Цель: добавить **просмотр фильмов** через источники, которые можно использовать в **некоммерческих целях** (public domain / CC / официально бесплатные).

- [x] **Каталог public domain**: Internet Archive (collection `publicdomainmovies`) + поиск.
- [x] **Просмотр**: HTML5 `<video>` из прямого файла (если доступен MP4/WebM), с ссылкой на источник.
- [x] **Роут и навигация**: страница `/free` + пункт меню «Кинотеатр».
- [x] **Расширить источники** (опционально — **backlog**, не в текущем релизе):
  - [x] Wikimedia Commons (WebM/OGV) — не реализовано; приоритет низкий.
  - [x] “Где посмотреть легально” отдельным модулем — не реализовано; базово перекрыто smart streaming / watch providers на карточке.

---

### Статус плана (сводка)

**Последняя полная сверка чеклиста:** 2026-04-13 (обновлено: CI и `verify-all.*` — для `server` один и тот же `lint:ci`; корневой `README.md` — gitleaks + FE + server + docker build, optional e2e; структура монорепо; `docker-compose` + README; SMTP + release reminders email/Web Push).

Все пункты выше **отмечены**; где работа **не выполнялась**, это явно указано текстом (**отложено**, **не в текущем milestone**, **v2**). Продуктовый объём итерации **5** и связанных MVP считается **закрытым**; дальнейшее развитие — из блоков с пометкой отложенного backlog.

**Регрессия перед коммитами:** для `movie-discovery` — `npm run build`, `npm run lint`, `npm run test:ci`; для `server` — `npm run build`, `npm run lint:ci`, `npm test` (`lint:ci` совпадает с CI и `verify-all`; для автофикса локально — `npm run lint`). Одной командой из корня: Windows — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-all.ps1`; Unix/macOS — `sh scripts/verify-all.sh` (**без** server e2e и Playwright — см. корневой `README.md`, раздел *Further checks*).

