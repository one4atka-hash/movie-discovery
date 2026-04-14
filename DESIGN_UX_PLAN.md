# Design / UX Plan (April 2026)

Цель: выровнять интерфейс под одну **“Movie OS”** стилистику и сделать продукт **user‑friendly**: понятные страницы, стабильные паттерны, минимум “разработческих” терминов в основном UI, progressive disclosure для advanced-фич.

Связанные документы:
- `ROADMAP.md` — источник требований и сделанных MVP‑решений.
- `UIUX_TODO.md` — рабочий backlog задач по IA/копирайту/объединениям.

---

## Что уже хорошо (база, на которой строим)

- **Design tokens** в `movie-discovery/src/styles.scss`: единая палитра, радиусы, тени, focus ring, dark/light темы.
- **Компонентный набор** (MVP): `Button`, `FormField`, `Card`, `Chip`, `Toast`, `BottomSheet`, skeleton/empty/error patterns (частично).
- **Единая шапка** (`Shell`) с sticky header, понятной навигацией, a11y `:focus-visible`.
- **Movie actions**: быстрые действия на карточках/в sheet (лайк/дизлайк/подписка/статус).
- **Server connect**: переезд с “вставь JWT” на user‑flow (логин/регистрация) + advanced секция для сырых токенов.

---

## Референсы и паттерны у аналогов (что “забираем”)

### Letterboxd (дневник + постер как интерфейс)
Источник: `https://blakecrosley.com/guides/design/letterboxd`
- **Poster‑driven UI**: постер — главный “контрол”, не иллюстрация.
- **Diary framing**: “дневник” как спокойная запись, а не перформативный пост.
- **Сильный бренд**: минимум цветов, но каждый имеет смысл (action/paid/links).

### Trakt (лист‑менеджмент + понятные иконки действия)
Источник: `https://medium.com/trakt-tv-blog/manage-your-watchlist-personal-lists-9e4fdc521e3d`
- **Watchlist vs Personal lists**: watchlist авто‑очищается после просмотра; личные списки — нет.
- **“Blue list icon” как глобальный affordance**: единая иконка “добавить в списки” везде.
- **Quick mode / long‑press**: быстрый сценарий по умолчанию + расширенный через удержание/доп. диалог.

### Netflix (борьба с decision fatigue)
Источник: `https://dataconomy.com/2026/01/21/netflix-plans-2026-mobile-app-redesign-to-drive-daily-user-engagement/`
- **Decision fatigue**: первая поверхность должна давать “что нажать сейчас” (continue‑like / shortlist‑like).
- **Короткие discovery surfaces**: маленькие порции контента + понятный next action.

Примечание: JustWatch/IMDb статьи верифицировали через web search, но часть страниц закрыта (403/503). Их паттерны оставляем как целевые (см. ниже), без прямого цитирования закрытых источников.

---

## Единый дизайн‑язык (конвенции)

### Принципы
- **Progressive disclosure**: всё “сложное” — в `Advanced` (`<details>` или sheet).
- **Один mental model**: пользователь “подключается к серверу”, а не “хранит JWT”.
- **Одинаковые паттерны = меньше обучения**: одинаковые CTA, одинаковые статусы, одинаковые empty/error.
- **Copy = UX**: в каждом важном блоке коротко: “зачем” + “что нажать”.

### Токены и визуальные правила (не ломаем)
- **Spacing scale**: 8/12/16/24 (как базовая сетка).
- **Touch targets**: ≥44px.
- **Focus**: только `:focus-visible`, с `--focus-ring`.
- **Surface**: `--bg`, `--bg-elevated`, `--border-subtle/strong`, тени `--shadow-*`.

### Компонентные паттерны (как “должно выглядеть” везде)
- **Page header**: `H1` + (purpose) + 1 primary action (если есть).
- **Section header**: название + purpose/instruction (2 строки максимум).
- **Empty state**: что это + почему пусто + 1 CTA.
- **Error state**: что пошло не так + retry + (опц.) details для advanced.
- **Action entrypoint**: “⋯” / “Actions” должен открывать один и тот же `MovieActionsSheet`.

---

## IA (информационная архитектура) — целевой вид

Это кратко совпадает с `UIUX_TODO.md`, но здесь фиксируем “как будет ощущаться пользователю”.

### Discover (`/`)
- **Primary**: поиск (всегда сверху, быстро).
- **Surfaces**: “Сейчас в кино”, “Скоро выйдет”, “Рекомендации”, “Случайная подборка”.
- **Каждый блок**: purpose + next step (например: “обновить”, “развернуть”, “открыть отдельно”).

### Tonight (`/decide`)
- Сценарий “за 30 секунд”: ограничения → shortlist → winner.
- Пояснения только для реально работающих ограничений; остальное — скрыть или пометить.

### Diary (`/diary`)
- Лента записей + быстрый вход “залогировать” из карточки фильма.
- Без смешения RU/EN (строго через `i18n.t()`).

### Lists hub (`/collections`)
- Таб “Статусы” (watchlist/watching/watched и т.п.).
- Таб “Коллекции” (ручные подборки).
- `/watchlist` → redirect/alias.

### Inbox hub (`/inbox`)
- Таб “Feed” (уведомления/релизы).
- Таб “Rules” (правила).
- `/notifications` → redirect/alias.

### Account (`/account`)
- Блоки: Profile, Connections, Preferences, Data & Privacy, Advanced.
- Advanced скрыт по умолчанию, там dev‑инструменты/диагностика.

---

## Дизайн‑аудит (коротко: где ломается консистентность)

### 1) Дубли страниц/сущностей
- **Lists**: `Watchlist` и `Collections` живут отдельно → нужно объединение.
- **Inbox/Notifications**: “центр уведомлений” разъезжается по страницам → нужен один хаб.

### 2) Разные точки входа в действия
- Карточка фильма иногда содержит “уникальные” кнопки/порядок → закрепить один entrypoint и один порядок в sheet/карточке.

### 3) Copy и i18n
- Местами ещё встречается “разработческий” тон или смешение языков → обязать `purpose/instruction` ключи и убрать “JWT/ENV” из основного UI.

---

## План работ (по этапам, чтобы можно было коммитить маленькими PR)

### M1 — быстрые победы (копирайт + подсказки + мелкая консистентность)
- Добавить **purpose/instruction** вверху ключевых страниц (`/`, `/decide`, `/diary`, `/collections`, `/inbox`, `/account`).
- Выровнять “Actions/Why” копирайт и affordances (одни и те же слова, те же места).
- В `movie-card`: унифицировать `title`/aria для реакций (like/dislike/subscribe/status) через i18n.

### M2 — IA объединения (снятие дублей)
- **Lists hub**: `/collections` → tabs “Статусы” + “Коллекции”; `/watchlist` → redirect.
- **Inbox hub**: management подписок/релизов и уведомлений внутри `/inbox`; `/notifications` → redirect.

### M3 — “No tokens” и onboarding
- Подключения (server/push/email) должны быть user‑grade: статусы, причины недоступности, retry.
- Advanced оставляем для dev/диагностики, но не как “основной путь”.

---

## Метрики (что будем мерить после каждого этапа)

- **Time‑to‑first‑action**: открыть приложение → выполнить 1 действие (поиск/добавить в watchlist/залогировать) за ≤30 секунд без подсказок.
- **Dead‑CTA rate**: доля кнопок, которые “непонятно зачем” или ведут в тупик (должна стремиться к 0).
- **Consistency checks**: одинаковые состояния empty/error/retry на ключевых страницах.
- **A11y smoke**: таб‑навигация, видимый фокус, aria‑pressed на переключателях.

---

## Definition of Done (для “редизайн план готов”)

- Документ фиксирует: IA, паттерны, страницы, этапы, метрики.
- Любая задача из `UIUX_TODO.md` однозначно маппится на этап M1/M2/M3.
- Есть “маленькие” изменения, которые можно делать коммитами и не ломать продукт.

