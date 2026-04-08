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
- [x] Resolver для предварительной загрузки данных фильма.
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

