import { Injectable, computed, signal } from '@angular/core';

import { readStoredLocale, writeLocalePreference } from '@core/browser-prefs';
import { inferLocaleFromEnvironment } from '@core/infer-locale-from-environment';

/** UI-словари: только ru / en (остальные локали TMDB → EN). */
export type UiLang = 'ru' | 'en';

const STORAGE_V1 = 'app.lang.v1';

type Dict = Record<string, string>;

const RU: Dict = {
  'app.brand': 'Movie Discovery',
  'promo.title': 'Поддержать проект',
  'promo.subtitle': 'Донат на развитие и новые функции.',
  'promo.headerLabel': 'Поддержка',
  'promo.linksAria': 'Ссылки для доната',

  'nav.home': 'Главная',
  'nav.tonight': 'Сегодня',
  'nav.diary': 'Дневник',
  'nav.lists': 'Списки',
  'nav.watchlist': 'Список',
  'nav.inbox': 'Входящие',
  'nav.favorites': 'Избранное',
  'nav.notifications': 'Уведомления',
  'nav.account': 'Аккаунт',
  'theme.light': '☀ Светлая',
  'theme.dark': '🌙 Тёмная',
  'lang.selectAria': 'Язык интерфейса и данные TMDB',
  'lang.tmdbDataHint':
    'Запросы к TMDB передают параметр language: названия и описания приходят на выбранном языке, если перевод есть в базе TMDB (иначе — на английском).',

  'home.title': 'Выбор фильма на вечер — быстро и без лишнего шума.',
  'home.subtitle': 'Поиск, избранное, трейлеры и ссылки на стриминги (подписка, аренда, покупка).',
  'home.cta.search': 'Открыть поиск',
  'home.apiKeyNote':
    'Для запросов к TMDB нужен API key. Скопируйте public/env.example.js → public/env.js и задайте TMDB_API_KEY.',
  'home.showcaseTitle': 'Витрина: популярное сейчас',
  'home.showcaseLink': 'Искать по названию →',
  'home.openDetails': 'Открыть детали',
  'home.section.subscriptions': 'Подписки на релиз',
  'home.section.favorites': 'Избранное',
  'home.section.newReleases': 'Сейчас в кино',
  'home.section.recommendations': 'Рекомендации',
  'home.section.random': 'Случайная подборка',
  'home.recommendationsEmpty': 'Добавьте пару фильмов в избранное — и здесь появятся рекомендации.',
  'home.recommendationsRefresh': 'Обновить рекомендации',
  'home.recommendationsRefreshAria': 'Обновить список рекомендаций',
  'home.loginForSubs': 'Войдите в аккаунт, чтобы видеть и управлять подписками.',
  'home.favoritesEmptyTitle': 'Избранное пустое',
  'home.favoritesEmptySubtitle': 'Добавьте фильмы с страницы поиска или карточки фильма.',
  'home.railAria': 'Личное: подписки и избранное',
  'home.subsSeeAll': 'Все подписки в аккаунте',
  'home.favoritesSeeAll': 'Всё избранное в аккаунте',

  'account.title': 'Аккаунт',
  'account.subtitle': 'Нужен для синхронизации подписок и уведомлений о релизах.',
  'account.loggedInAs': 'Вы вошли как',
  'account.myNotifications': 'Подписки на главной',
  'account.section.subscriptions': 'Подписки на релиз',
  'account.section.favorites': 'Избранное',
  'account.logout': 'Выйти',
  'account.login': 'Войти',
  'account.register': 'Создать аккаунт',
  'account.email': 'Email',
  'account.password': 'Пароль',
  'account.passwordHint': 'Минимум 6 символов.',
  'account.publicProfile.title': 'Публичный профиль (server)',
  'account.publicProfile.hint':
    'Нужен Server JWT. Страница `/u/slug` доступна при enabled + unlisted/public.',
  'account.publicProfile.load': 'Загрузить с сервера',
  'account.publicProfile.save': 'Сохранить',
  'account.publicProfile.preview': 'Превью',
  'account.publicProfile.enabled': 'Включить публичную страницу',
  'account.publicProfile.visibility': 'Видимость',
  'account.publicProfile.sections': 'Какие секции показывать',
  'account.publicProfile.needJwt': 'Сначала вставьте Server JWT в блоке выше.',
  'account.publicProfile.loadFailed': 'Не удалось загрузить настройки.',
  'account.publicProfile.saveFailed': 'Не удалось сохранить.',
  'account.publicProfile.saved': 'Сохранено на сервере.',
  'publicProfile.back': '← На главную',
  'publicProfile.loading': 'Загрузка…',
  'publicProfile.notFound': 'Профиль не найден или скрыт.',
  'publicProfile.badSlug': 'Некорректный адрес.',
  'publicProfile.loadError': 'Ошибка загрузки',
  'publicProfile.favorites': 'Избранное',
  'publicProfile.diary': 'Дневник',
  'publicProfile.entries': 'Записей',
  'publicProfile.watchlist': 'Смотреть позже',

  'notifications.title': 'Уведомления о релизах',
  'notifications.subtitle': 'Отметьте фильм — и в день выхода мы напомним (канал выбираете вы).',
  'notifications.addFromSearch': 'Добавить из поиска',
  'notifications.addById': 'Добавить подписку по TMDB id',
  'notifications.load': 'Загрузить',
  'notifications.save': 'Сохранить подписку',
  'notifications.testPush': 'Тест Web Push',
  'notifications.downloadIcs': 'Скачать .ics',
  'notifications.mySubs': 'Мои подписки',
  'notifications.empty': 'Пока пусто. Откройте фильм и нажмите «Следить за релизом».',
  'notifications.open': 'Открыть',
  'notifications.remove': 'Удалить',
  'notifications.emailHint':
    'In-app и Web Push срабатывают при открытом приложении в день релиза. Email: если в public/env.js задан RELEASE_ALERT_WEBHOOK_URL — письмо уходит через ваш сервер; иначе откроется черновик письма вам на ваш адрес (mailto).',

  'reminders.inAppBanner':
    'Сегодня релиз: {{titles}}. На главной откройте блок «Подписки на релиз».',
  'reminders.pushTitle': 'Movie Discovery',
  'reminders.pushBodyOne': 'Сегодня выходит: {{title}}',
  'reminders.pushBodyMany': 'Сегодня выходят {{count}} фильмов: {{titles}}',
  'reminders.emailIntro': 'Напоминание Movie Discovery: сегодня дата релиза по вашим подпискам.',
  'reminders.emailFooter': '— Movie Discovery',
  'reminders.emailSubjectOne': 'Релиз сегодня: {{title}}',
  'reminders.emailSubjectMany': 'Релизы сегодня ({{count}} фильмов)',

  'details.back': '← Назад к поиску',
  'details.followRelease': 'Следить за релизом',
  'details.releaseAlertsTitle': 'Уведомления о релизе',
  'details.releaseNoDateHint':
    'Для подписки нужна дата релиза в TMDB. Пока её нет — сохранить напоминание нельзя.',
  'details.releaseNoDateSave': 'У фильма нет даты релиза (release_date).',
  'details.timeline.title': 'Timeline (релизы TMDB)',
  'details.timeline.hint':
    'Нужен Server JWT (Account / Inbox). Данные из кэша сервера (release_dates).',
  'details.timeline.loading': 'Загрузка…',
  'details.timeline.unavailable': 'Не удалось загрузить release_dates.',
  'details.timeline.region': 'Регион',
  'details.timeline.entries': 'записей дат',
  'details.timeline.remindersTitle': 'Напоминания (сервер)',
  'details.timeline.reminderType': 'Тип трека',
  'details.timeline.daysBefore': 'За сколько дней',
  'details.timeline.inApp': 'In-app уведомление',
  'details.timeline.save': 'Сохранить напоминание',
  'details.timeline.none': 'Нет напоминаний для этого фильма',
  'inbox.serverReminders.title': 'Release reminders (server)',
  'details.loginToSubscribe': 'Войти, чтобы подписаться',
  'details.inFavorites': '♥ В избранном',
  'details.addToFavorites': '♡ В избранное',
  'details.facts.status': 'Статус',
  'details.facts.runtime': 'Длительность',
  'details.facts.lang': 'Язык',
  'details.facts.originalTitle': 'Оригинальное название',
  'details.facts.countries': 'Страны',
  'details.facts.aria': 'Метаданные',
  'details.links.homepage': 'Официальный сайт',
  'details.overview.empty': 'Описание отсутствует.',
  'details.trailer.title': 'Трейлер',
  'details.trailer.embedUnavailable': 'Трейлер недоступен для встраивания.',
  'details.trailer.openSource': 'Открыть источник',
  'details.error.title': 'Не удалось загрузить фильм',
  'details.error.subtitle': 'Проверьте id и API-ключ.',
  'movieCard.fav.title': 'В избранное',

  'details.hubs.title': 'Где смотреть онлайн',
  'details.hubs.note':
    'Ссылки открывают поиск по названию на крупных сервисах (в т.ч. платных и по подписке). Точная карточка фильма может отличаться.',

  'details.hub.justwatch': 'JustWatch (все сервисы)',
  'details.hub.netflix': 'Netflix',
  'details.hub.prime': 'Prime Video',
  'details.hub.disney': 'Disney+',
  'details.hub.apple': 'Apple TV',
  'details.hub.googleplay': 'Google Play Фильмы',
  'details.hub.youtube': 'YouTube',
  'details.hub.max': 'Max (HBO)',
  'details.hub.hulu': 'Hulu',
  'details.hub.paramount': 'Paramount+',
  'details.hub.peacock': 'Peacock',
  'details.hub.imdb': 'IMDb',
  'details.hub.kinopoisk': 'Кинопоиск',
  'details.hub.ivi': 'Иви',
  'details.hub.okko': 'Okko',
  'details.hub.wink': 'Wink',
  'details.hub.start': 'START',
  'details.hub.premier': 'PREMIER',

  'details.watch.tmdbTitle': 'Официальные провайдеры (TMDB)',
  'details.watch.tmdbSubtitle': 'Данные JustWatch по выбранной стране',
  'details.watch.region': 'Страна',
  'details.watch.regionPickAria': 'Выбор страны для списка провайдеров',
  'details.watch.justwatchBtn': 'Открыть страницу фильма на JustWatch',
  'details.watch.providersTitle': 'Сервисы с типом доступа',
  'details.watch.disclaimer':
    'Доступность и цены зависят от региона и могут меняться. Ссылки на сервисы ведут на поиск или агрегатор; мы не вещаем видео на сайте.',
  'details.watch.kind.flatrate': 'Подписка',
  'details.watch.kind.rent': 'Аренда',
  'details.watch.kind.buy': 'Покупка',
};

const EN: Dict = {
  'app.brand': 'Movie Discovery',
  'promo.title': 'Support the project',
  'promo.subtitle': 'Donations help ship new features.',
  'promo.headerLabel': 'Support',
  'promo.linksAria': 'Donation links',

  'nav.home': 'Home',
  'nav.tonight': 'Tonight',
  'nav.diary': 'Diary',
  'nav.lists': 'Lists',
  'nav.watchlist': 'Watchlist',
  'nav.inbox': 'Inbox',
  'nav.favorites': 'Favorites',
  'nav.notifications': 'Alerts',
  'nav.account': 'Account',
  'theme.light': '☀ Light',
  'theme.dark': '🌙 Dark',
  'lang.selectAria': 'Interface language and TMDB data language',
  'lang.tmdbDataHint':
    'TMDB requests include the language parameter: titles and overviews use that locale when a translation exists in TMDB (otherwise English).',

  'home.title': 'Pick a movie for tonight — fast and distraction-free.',
  'home.subtitle': 'Search, favorites, trailers, and links to streaming (subscription, rent, buy).',
  'home.cta.search': 'Open search',
  'home.apiKeyNote':
    'TMDB API key is required. Copy public/env.example.js to public/env.js and set TMDB_API_KEY.',
  'home.showcaseTitle': 'Trending now',
  'home.showcaseLink': 'Search by title →',
  'home.openDetails': 'Open details',
  'home.section.subscriptions': 'Release subscriptions',
  'home.section.favorites': 'Favorites',
  'home.section.newReleases': 'Now playing',
  'home.section.recommendations': 'Recommendations',
  'home.section.random': 'Random picks',
  'home.recommendationsEmpty': 'Add a couple favorites to see recommendations here.',
  'home.recommendationsRefresh': 'Refresh recommendations',
  'home.recommendationsRefreshAria': 'Refresh the recommendations list',
  'home.loginForSubs': 'Sign in to view and manage your subscriptions.',
  'home.favoritesEmptyTitle': 'No favorites yet',
  'home.favoritesEmptySubtitle': 'Add movies from search or a movie page.',
  'home.railAria': 'Personal: subscriptions and favorites',
  'home.subsSeeAll': 'All subscriptions in account',
  'home.favoritesSeeAll': 'All favorites in account',

  'account.title': 'Account',
  'account.subtitle': 'Required for syncing release alerts and reminders.',
  'account.loggedInAs': 'Signed in as',
  'account.myNotifications': 'Subscriptions on home',
  'account.section.subscriptions': 'Release subscriptions',
  'account.section.favorites': 'Favorites',
  'account.logout': 'Log out',
  'account.login': 'Sign in',
  'account.register': 'Create account',
  'account.email': 'Email',
  'account.password': 'Password',
  'account.passwordHint': 'At least 6 characters.',
  'account.publicProfile.title': 'Public profile (server)',
  'account.publicProfile.hint':
    'Requires Server JWT. `/u/slug` is available when enabled + unlisted/public.',
  'account.publicProfile.load': 'Load from server',
  'account.publicProfile.save': 'Save',
  'account.publicProfile.preview': 'Preview',
  'account.publicProfile.enabled': 'Enable public page',
  'account.publicProfile.visibility': 'Visibility',
  'account.publicProfile.sections': 'Sections to show',
  'account.publicProfile.needJwt': 'Paste Server JWT in the block above first.',
  'account.publicProfile.loadFailed': 'Could not load settings.',
  'account.publicProfile.saveFailed': 'Could not save.',
  'account.publicProfile.saved': 'Saved on server.',
  'publicProfile.back': '← Home',
  'publicProfile.loading': 'Loading…',
  'publicProfile.notFound': 'Profile not found or hidden.',
  'publicProfile.badSlug': 'Invalid URL.',
  'publicProfile.loadError': 'Load error',
  'publicProfile.favorites': 'Favorites',
  'publicProfile.diary': 'Diary',
  'publicProfile.entries': 'Entries',
  'publicProfile.watchlist': 'Watchlist',

  'notifications.title': 'Release alerts',
  'notifications.subtitle':
    'Track a movie and get a reminder on release day (choose your channel).',
  'notifications.addFromSearch': 'Add from search',
  'notifications.addById': 'Add subscription by TMDB id',
  'notifications.load': 'Load',
  'notifications.save': 'Save subscription',
  'notifications.testPush': 'Test Web Push',
  'notifications.downloadIcs': 'Download .ics',
  'notifications.mySubs': 'My subscriptions',
  'notifications.empty': 'No subscriptions yet. Open a movie and click “Follow release”.',
  'notifications.open': 'Open',
  'notifications.remove': 'Remove',
  'notifications.emailHint':
    'In-app and Web Push fire when the app is open on release day. Email: if RELEASE_ALERT_WEBHOOK_URL is set in public/env.js, your server sends the message; otherwise a mailto draft opens to your own address.',

  'reminders.inAppBanner':
    'Out today: {{titles}}. On the home page, open the “Release subscriptions” section.',
  'reminders.pushTitle': 'Movie Discovery',
  'reminders.pushBodyOne': 'Out today: {{title}}',
  'reminders.pushBodyMany': '{{count}} movies out today: {{titles}}',
  'reminders.emailIntro':
    'Movie Discovery reminder: today is the release date for your tracked titles.',
  'reminders.emailFooter': '— Movie Discovery',
  'reminders.emailSubjectOne': 'Out today: {{title}}',
  'reminders.emailSubjectMany': 'Out today ({{count}} movies)',

  'details.back': '← Back to search',
  'details.followRelease': 'Follow release',
  'details.releaseAlertsTitle': 'Release alerts',
  'details.releaseNoDateHint':
    'A TMDB release date is required to subscribe. It is missing for this title.',
  'details.releaseNoDateSave': 'This movie has no release_date in TMDB.',
  'details.timeline.title': 'Timeline (TMDB releases)',
  'details.timeline.hint':
    'Requires Server JWT (Account / Inbox). Data from server cache (release_dates).',
  'details.timeline.loading': 'Loading…',
  'details.timeline.unavailable': 'Could not load release_dates.',
  'details.timeline.region': 'Region',
  'details.timeline.entries': 'date entries',
  'details.timeline.remindersTitle': 'Reminders (server)',
  'details.timeline.reminderType': 'Track type',
  'details.timeline.daysBefore': 'Days before',
  'details.timeline.inApp': 'In-app notification',
  'details.timeline.save': 'Save reminder',
  'details.timeline.none': 'No reminders for this title',
  'inbox.serverReminders.title': 'Release reminders (server)',
  'details.loginToSubscribe': 'Sign in to subscribe',
  'details.inFavorites': '♥ In favorites',
  'details.addToFavorites': '♡ Add to favorites',
  'details.facts.status': 'Status',
  'details.facts.runtime': 'Runtime',
  'details.facts.lang': 'Language',
  'details.facts.originalTitle': 'Original title',
  'details.facts.countries': 'Countries',
  'details.facts.aria': 'Metadata',
  'details.links.homepage': 'Official website',
  'details.overview.empty': 'No overview available.',
  'details.trailer.title': 'Trailer',
  'details.trailer.embedUnavailable': 'Trailer cannot be embedded.',
  'details.trailer.openSource': 'Open source',
  'details.error.title': 'Could not load movie',
  'details.error.subtitle': 'Check the id and API key.',
  'movieCard.fav.title': 'Add to favorites',

  'details.hubs.title': 'Where to watch online',
  'details.hubs.note':
    'Links open a title search on major services (including paid and subscription). The exact title page may differ.',

  'details.hub.justwatch': 'JustWatch (all providers)',
  'details.hub.netflix': 'Netflix',
  'details.hub.prime': 'Prime Video',
  'details.hub.disney': 'Disney+',
  'details.hub.apple': 'Apple TV',
  'details.hub.googleplay': 'Google Play Movies',
  'details.hub.youtube': 'YouTube',
  'details.hub.max': 'Max (HBO)',
  'details.hub.hulu': 'Hulu',
  'details.hub.paramount': 'Paramount+',
  'details.hub.peacock': 'Peacock',
  'details.hub.imdb': 'IMDb',
  'details.hub.kinopoisk': 'Kinopoisk',
  'details.hub.ivi': 'IVI',
  'details.hub.okko': 'Okko',
  'details.hub.wink': 'Wink',
  'details.hub.start': 'START',
  'details.hub.premier': 'PREMIER',

  'details.watch.tmdbTitle': 'Official providers (TMDB)',
  'details.watch.tmdbSubtitle': 'JustWatch data for the selected country',
  'details.watch.region': 'Country',
  'details.watch.regionPickAria': 'Choose country for provider list',
  'details.watch.justwatchBtn': 'Open this movie on JustWatch',
  'details.watch.providersTitle': 'Services by access type',
  'details.watch.disclaimer':
    'Availability and pricing depend on your region and change over time. Links go to search or aggregators; we do not stream video on this site.',
  'details.watch.kind.flatrate': 'Subscription',
  'details.watch.kind.rent': 'Rent',
  'details.watch.kind.buy': 'Buy',
};

function readInitialTmdbLocale(): string {
  const stored = readStoredLocale();
  if (stored) return stored;
  try {
    const v1 = localStorage.getItem(STORAGE_V1)?.trim();
    if (v1 === 'en') return 'en-US';
    if (v1 === 'ru') return 'ru-RU';
  } catch {
    /* private mode */
  }
  return inferLocaleFromEnvironment();
}

function uiLangFromTmdbLocale(locale: string): UiLang {
  const base = locale.split('-')[0]?.toLowerCase() ?? 'en';
  return base === 'ru' ? 'ru' : 'en';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _tmdbLocale = signal<string>(readInitialTmdbLocale());

  /** Локаль TMDB: `en-US`, `ru-RU`, … (параметр `language` в API). */
  readonly tmdbLocale = this._tmdbLocale.asReadonly();

  /** Для UI-строк: русский интерфейс только при русской локали TMDB. */
  readonly uiLang = computed<UiLang>(() => uiLangFromTmdbLocale(this._tmdbLocale()));

  readonly dict = computed(() => (this.uiLang() === 'en' ? EN : RU));

  constructor() {
    if (!readStoredLocale()) {
      writeLocalePreference(this._tmdbLocale());
    }
    this.applyDocumentLang(this._tmdbLocale());
  }

  /**
   * Устанавливает локаль TMDB; при необходимости проверяйте код по списку `primary_translations`.
   */
  setTmdbLocale(locale: string, allowed?: readonly string[]): void {
    const next = locale.trim();
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(next)) return;
    if (allowed && allowed.length && !allowed.includes(next)) return;
    this._tmdbLocale.set(next);
    writeLocalePreference(next);
    this.applyDocumentLang(next);
  }

  /** @deprecated Используйте `setTmdbLocale` и список из TMDB. */
  toggleLang(): void {
    const cur = this._tmdbLocale();
    this.setTmdbLocale(uiLangFromTmdbLocale(cur) === 'ru' ? 'en-US' : 'ru-RU');
  }

  /** Совместимость: `ru` | `en` для хабов и региона. */
  lang(): UiLang {
    return this.uiLang();
  }

  t(key: string): string {
    return this.dict()[key] ?? key;
  }

  private applyDocumentLang(locale: string): void {
    document.documentElement.lang = locale;
  }
}
