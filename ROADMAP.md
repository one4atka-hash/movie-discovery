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
  - [x] Email: dev `POST /api/email/dev/send-test` (JWT, `DEV_EMAIL_SEND_ENABLED`); **cron release reminders** — plain-text при `channels.email` + `SMTP_*`; digest/outbox для правил — **не в текущем milestone**.
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
  - [x] FE: секция “Timeline” на movie details + форма server reminders (in-app + опционально Web Push / email); в Inbox — блок «Release reminders (server)» при Load server feed (нужен Server JWT).
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

#### Portfolio (отдельный проект)
- [x] Создать отдельную папку проекта: `portfolio-site/` (заготовка: `README.md`, `index.html`).

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

**Последняя полная сверка чеклиста:** 2026-04-13 (обновлено: SMTP + dev `POST /api/email/dev/send-test`; cron release reminders — email при `channels.email` + `SMTP_*`; Web Push из dev `alerts/run` при правиле с `channels.webPush`).

Все пункты выше **отмечены**; где работа **не выполнялась**, это явно указано текстом (**отложено**, **не в текущем milestone**, **v2**). Продуктовый объём итерации **5** и связанных MVP считается **закрытым**; дальнейшее развитие — из блоков с пометкой отложенного backlog.

**Регрессия перед коммитами:** для `movie-discovery` — `npm run build`, `npm run lint`, `npm run test:ci`; для `server` — `npm run build`, `npm run lint`, `npm test` (зелёный прогон зафиксирован при обновлении этого раздела). Одной командой из корня репозитория: Windows — `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-all.ps1`; Unix/macOS/CI — `sh scripts/verify-all.sh`.

