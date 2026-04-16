## UI/UX Redesign Plan (todo list)

Цель: превратить текущий интерфейс в **user‑friendly продукт**, где функции лежат на **логичных страницах**, а в каждом блоке есть:
- **Purpose**: 1 строка “для чего этот блок”
- **Instruction**: 1 строка “как пользоваться / следующий шаг”
- (опц.) `<details>` “Почему/как это работает” для продвинутых

Принципы:
- **Progressive disclosure**: продвинутые/тех. штуки прячем в “Advanced”.
- **No tokens in UI**: пользователь не вставляет JWT/ключи вручную.
- **Один ментальный аккаунт**: вход/подключения объясняются простым языком.
- **Стабильная IA**: меньше вкладок/страниц, меньше дублей (Lists/Watchlist, Inbox/Notifications).
- **Копирайт = часть UX**: коротко, по делу, без “мемо для разработчика”.

---

## IA (информационная архитектура) — компактно по страницам

### 1) Discover / Главная (`/`)
Содержимое:
- **Поиск** (главная CTA)
- **Избранное (sidebar)**: “быстрый доступ” (плитка), без сортировки, без объяснения сложных терминов
- **Сейчас в кино** (скролл‑полоса)
- **Скоро выйдет** (upcoming): все не вышедшие новинки, отсортированные по дате (самое ближайшее → самое дальнее)
- **Рекомендации** (кнопка “обновить”, expand, open page)
- **Случайная подборка** (expand, open page)

Должно быть:
- В каждом блоке: purpose + instruction (коротко, 2 строки).
- “Why?” и “⋯ actions” — единая семантика и подсказки.

Параметры блока “Скоро выйдет” (upcoming):
- **Источник**: TMDB `movie/upcoming` + пагинация (несколько страниц, пока не наберём нужный объём).
- **Фильтр**: только фильмы с `release_date` в будущем относительно “сегодня” (локальная дата).
- **Сортировка**: по `release_date` ASC (сначала “вот‑вот”, в конце — максимально дальние даты).
- **Лимиты**:
  - На главной: показывать 1–2 строки (expand → больше), + “Open page” на `/upcoming`.
  - На отдельной странице: показывать все (lazy load / paging).
- **UX**:
  - Показывать дату релиза как badge (“через 3 дня” / “2026‑05‑01”).
  - Empty state: объяснить, что зависит от базы TMDB и выбранной локали/региона.

### 2) Today / Сегодня (`/decide`)
Содержимое:
- “Movie night” сценарий: constraints → shortlist → выбор победителя
- (опц.) “Invite friends / group mode” (будущий Iteration 6)

Должно быть:
- Ясный ответ “что делать здесь за 30 секунд”.
- Пояснения к ограничениям (только то, что реально работает).

### 3) Diary / Дневник (`/diary`)
Содержимое:
- Лента просмотров
- Добавить запись (sheet)
- Статистика

Должно быть:
- Подсказка “как быстро логировать из карточки фильма”.
- Единый язык интерфейса (без смешения RU/EN).

### 4) Lists / Списки (`/collections`) — объединить
Содержимое:
- Tab 1: **Статусы** (watchlist / watching / watched / …) — (сейчас `/watchlist`)
- Tab 2: **Коллекции** (ручные подборки) — (сейчас `/collections`)

Должно быть:
- `/watchlist` становится алиасом/редиректом.
- Добавление фильма в коллекцию через **поиск/выбор**, а не “ручной title”.

### 5) Inbox / Входящие (`/inbox`) — единый центр уведомлений
Содержимое:
- Tab 1: **Feed** (уведомления + релизы)
- Tab 2: **Rules** (правила)
- Tab 3 (если нужно): **Release subscriptions** (если не встроим в Feed)

Должно быть:
- `/notifications` становится алиасом/редиректом на Inbox‑секцию.
- Server/local источники не должны путать пользователя (одна модель “уведомлений”).

### 6) Account / Аккаунт (`/account`) — полностью user‑friendly
Содержимое:
- **Profile** (slug, public visibility, preview)
- **Connections** (server connect, push/email)
- **Preferences** (region/providers)
- **Data & Privacy** (export/import)
- **Advanced** (dev tools, diagnostics) — hidden by default

Должно быть:
- Никаких textarea “вставь JWT”.
- Внятные статусы: Connected / Not connected.

---

## UX Copy & i18n (единый стандарт)

Добавить i18n ключи формата:
- `<feature>.<block>.purpose`
- `<feature>.<block>.instruction`
- `<feature>.<block>.emptyTitle`
- `<feature>.<block>.emptyInstruction`
- `<feature>.<block>.whyTitle` / `.whyBody` (для `<details>`/sheet)

Запрет:
- Не писать “вставь JWT”, “поставь ENV” в обычном UI.
- Dev‑текст только в Advanced и с явной маркировкой “для разработчиков”.

---

## Design System (общие компоненты/паттерны)

### UI primitives (использовать везде)
- Button variants: primary/secondary/ghost/icon/loading
- Card/Section: добавить optional subtitle slot (purpose/instruction)
- EmptyState: всегда с 1 CTA минимум
- DetailsDisclosure: единый стиль для `<details>/<summary>`
- Toast: краткие подтверждения (Saved/Removed/Failed)

### Layout consistency
- Header pattern: Title + purpose + 1 primary action
- Spacing scale: 8/12/16/24
- Touch targets ≥44px (уже частично сделано)

---

## TODO (M1 → M3)

### M1 — Быстрые победы (копирайт + подсказки + IA без больших рефакторов)
- [x] **В каждой вкладке** добавить цель + “что нажать дальше” вверху страницы.
- [x] **Discover**: purpose/instruction для “Сейчас в кино / Скоро выйдет / Рекомендации / Случайная подборка / Избранное”.
- [x] **Today**: честные подсказки по constraints (убрать обещания того, чего нет).
- [x] **Diary**: унифицировать RU/EN строки через `i18n.t(...)`.
- [x] **Inbox**: объяснить 2 режима (local/server) без слова JWT в основном UI (JWT только в Advanced).
- [x] **Account**: перестроить на блоки Profile/Connections/Preferences/Data/Advanced (без изменения функционала).

### M2 — IA объединения (снятие дублей)
- [x] **Lists hub**: `/collections` → tabs “Статусы” + “Коллекции”; `/watchlist` → redirect.
- [x] **Inbox hub**: перенести release subscriptions management из `/notifications` в Inbox; `/notifications` → redirect.
- [x] **Movie actions**: единые entrypoints “Add to diary / Add to list / Follow release”.

### M3 — “No tokens” и настоящий onboarding
- [x] **Connect to server**: логин/регистрация на server через `/api/auth/*`, токен хранить скрыто.
- [x] **Connections UI**: Web Push connect/disconnect; Email setup (user‑grade, не dev endpoint).
- [x] **Data & Privacy**: экспорт/импорт как понятный мастер (не “Open Import” без контекста).

### M4 — Персональная страница + оформление (“луки”)
- [x] **Public profile**: добавить “О себе” + “мысли/заметки” + “планы” секции (приятно делиться ссылкой).
- [x] **Looks (themes)**: экран “Оформление” в аккаунте: список луков, превью, сделать активным.
- [x] **Look editor**: layout (арт‑панель слева/справа/сверху/снизу или фон/градиент), шрифты (3 размера), акцентный цвет.
- [x] **Доступ**:
  - [x] Оформление публичной страницы — бесплатно.
  - [x] Создание своего лука — символический донат (в MVP: ручной unlock/код; позже — платёжная интеграция).

---

## Acceptance Criteria (как понять, что стало user‑friendly)
- Пользователь без чтения README понимает:
  - где искать фильм, где логировать просмотр, где управлять списками, где уведомления
  - что значит каждая вкладка за 10 секунд
- В UI нет токенов/секретов/ключей в основном интерфейсе.
- Нигде нет “мёртвых” кнопок: каждый CTA ведёт к действию или объясняет, почему недоступно.

