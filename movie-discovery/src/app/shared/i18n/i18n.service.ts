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
  'common.retry': 'Повторить',
  'common.expand': 'Развернуть',
  'common.collapse': 'Свернуть',
  'common.openPage': 'Открыть отдельно',

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
  'account.emailDev.hint':
    'Dev: тест SMTP через API (нужны Server JWT, DEV_EMAIL_SEND_ENABLED и SMTP_* на сервере).',
  'account.emailDev.button': 'Отправить тестовое письмо',
  'account.emailDev.ok': 'Запрос принят — проверьте почту (и спам).',
  'account.emailDev.failed': 'Запрос не выполнен (сеть или нет JWT).',
  'account.emailDev.apiError': 'API: {{error}}',
  'publicProfile.back': '← На главную',
  'publicProfile.loading': 'Загрузка…',
  'publicProfile.notFound': 'Профиль не найден или скрыт.',
  'publicProfile.badSlug': 'Некорректный адрес.',
  'publicProfile.loadError': 'Ошибка загрузки',
  'publicProfile.favorites': 'Избранное',
  'publicProfile.diary': 'Дневник',
  'publicProfile.entries': 'Записей',
  'publicProfile.watchlist': 'Смотреть позже',

  'share.title': 'Карточки для соцсетей',
  'share.subtitle':
    'Шаблоны с фиксированной вёрсткой (720×900): топ избранного, дневник за месяц, shortlist «Сегодня». Экспорт PNG в браузере (html2canvas).',
  'share.backAccount': 'Аккаунт',
  'share.templateTop10': 'Топ‑10',
  'share.templateMonth': 'Месяц',
  'share.templateTonight': 'Сегодня',
  'share.monthLabel': 'Месяц',
  'share.headTop10': 'Топ избранного',
  'share.headMonth': 'Дневник за месяц',
  'share.headTonight': 'Shortlist «Сегодня»',
  'share.cardFooter': 'Сгенерировано в Movie Discovery',
  'share.exportPng': 'Скачать PNG',
  'share.emptyTop10': 'Добавьте фильмы в избранное — тогда появится превью.',
  'share.emptyMonth':
    'В этом месяце нет записей дневника. Выберите другой месяц или добавьте просмотры.',
  'share.emptyTonight':
    'Сначала откройте «Сегодня» и нажмите «Собрать shortlist» — мы сохраним кандидатов для этой карточки (сессия браузера).',
  'share.exportOkTitle': 'Готово',
  'share.exportOkBody': 'PNG сохранён.',
  'share.exportFailTitle': 'Не вышло',
  'share.exportFailBody': 'Попробуйте ещё раз или отключите блокировку загрузок.',
  'account.shareCards.title': 'Карточки для соцсетей',
  'account.shareCards.hint':
    'Экспорт картинки: избранное, дневник за месяц или shortlist с страницы «Сегодня».',
  'account.shareCards.open': 'Открыть /share',
  'account.meHub.title': 'Мой хаб',
  'account.meHub.hint':
    'Сводка: watchlist, дневник, Inbox, рекомендации; быстрый поиск и общие действия с фильмом.',
  'account.meHub.open': 'Открыть /me',

  'me.title': 'Мой хаб',
  'me.subtitle':
    'Один экран: быстрый поиск, превью списков и рекомендации. Действия с фильмом — через нижнюю панель.',
  'me.backAccount': 'Аккаунт',
  'me.quickAddTitle': 'Быстрый поиск',
  'me.quickAddHint': 'Откроется главная с заполненной строкой поиска (от 2 символов).',
  'me.quickAddPlaceholder': 'Название фильма…',
  'me.quickAddCta': 'Искать',
  'me.sectionWatchlist': 'Смотреть позже',
  'me.sectionDiary': 'Дневник',
  'me.sectionInbox': 'Inbox и подписки',
  'me.sectionRecs': 'Рекомендации',
  'me.seeAll': 'Все →',
  'me.emptyWatchlist': 'Пока пусто — откройте карточку фильма и добавьте в список.',
  'me.emptyDiary': 'Записей ещё нет.',
  'me.inboxRulesPrefix': 'Локальных правил Inbox:',
  'me.releaseSubs': 'Подписки на релиз в аккаунте →',
  'me.favoritesLink': 'Избранное →',
  'me.recsLoading': 'Загружаем…',
  'me.recsEmpty': 'Добавьте избранное — появятся рекомендации по TMDB.',
  'me.recsErrorCtx': 'Рекомендации',
  'me.moreActions': 'Ещё…',

  'movieActions.subtitle': 'Статус списка, избранное и запись в дневник.',
  'movieActions.openDetails': 'Открыть фильм',
  'movieActions.cycleWatchlist': 'Статус списка',
  'movieActions.addFavorite': 'В избранное',
  'movieActions.removeFavorite': 'Убрать из избранного',
  'movieActions.logDiary': 'Записать в дневник',
  'movieActions.watchlistTitle': 'Список',
  'movieActions.favoritesTitle': 'Избранное',
  'movieActions.favAdded': 'Добавлено в избранное.',
  'movieActions.favRemoved': 'Убрано из избранного.',
  'movieActions.stWant': 'Хочу',
  'movieActions.stWatching': 'Смотрю',
  'movieActions.stWatched': 'Смотрел',
  'movieActions.stDropped': 'Бросил',
  'movieActions.stHidden': 'Скрыт',
  'movieActions.moreAria': 'Дополнительные действия',
  'movieActions.like': 'Нравится',
  'movieActions.dislike': 'Не нравится',
  'movieActions.reactionsTitle': 'Реакция',
  'movieActions.reactionSet': 'Сохранено.',
  'movieActions.reactionCleared': 'Снято.',
  'movieActions.followRelease': 'Подписаться на релиз',
  'movieActions.removeReleaseAlert': 'Отписаться от релиза',
  'movieActions.releaseTitle': 'Релиз',
  'movieActions.releaseNoDate': 'Нет даты релиза в TMDB — откройте карточку фильма.',
  'movieActions.releaseSaved': 'Подписка сохранена (in-app).',
  'movieActions.releaseRemoved': 'Подписка снята.',
  'movieActions.releaseLoginHint': 'Войдите, чтобы подписаться на дату релиза.',

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
  'details.timeline.webPush': 'Web Push (сервер, нужен VAPID)',
  'details.timeline.email': 'Email (сервер, нужен SMTP на API)',
  'details.timeline.emailHint':
    'Письмо уходит на email аккаунта, если на API заданы SMTP_HOST и т.д.',
  'details.timeline.save': 'Сохранить напоминание',
  'details.timeline.none': 'Нет напоминаний для этого фильма',
  'details.timeline.remove': 'Удалить',
  'details.timeline.chInApp': 'in-app',
  'details.timeline.chPush': 'push',
  'details.timeline.chEmail': 'email',
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
  'common.retry': 'Retry',
  'common.expand': 'Expand',
  'common.collapse': 'Collapse',
  'common.openPage': 'Open page',

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
  'account.emailDev.hint':
    'Dev: SMTP smoke test via API (needs Server JWT, DEV_EMAIL_SEND_ENABLED, and SMTP_* on the server).',
  'account.emailDev.button': 'Send test email',
  'account.emailDev.ok': 'Request accepted — check your inbox (and spam).',
  'account.emailDev.failed': 'Request failed (network or missing JWT).',
  'account.emailDev.apiError': 'API: {{error}}',
  'publicProfile.back': '← Home',
  'publicProfile.loading': 'Loading…',
  'publicProfile.notFound': 'Profile not found or hidden.',
  'publicProfile.badSlug': 'Invalid URL.',
  'publicProfile.loadError': 'Load error',
  'publicProfile.favorites': 'Favorites',
  'publicProfile.diary': 'Diary',
  'publicProfile.entries': 'Entries',
  'publicProfile.watchlist': 'Watchlist',

  'share.title': 'Share cards',
  'share.subtitle':
    'Fixed-layout templates (720×900): top favorites, diary month recap, Tonight shortlist. PNG export in the browser (html2canvas).',
  'share.backAccount': 'Account',
  'share.templateTop10': 'Top 10',
  'share.templateMonth': 'Month',
  'share.templateTonight': 'Tonight',
  'share.monthLabel': 'Month',
  'share.headTop10': 'Top favorites',
  'share.headMonth': 'Diary month recap',
  'share.headTonight': 'Tonight shortlist',
  'share.cardFooter': 'Generated in Movie Discovery',
  'share.exportPng': 'Download PNG',
  'share.emptyTop10': 'Add some favorites to see a preview.',
  'share.emptyMonth': 'No diary entries for this month. Pick another month or log watches.',
  'share.emptyTonight':
    'Open Tonight and tap “Build shortlist” first — we store candidates for this card for the browser session.',
  'share.exportOkTitle': 'Done',
  'share.exportOkBody': 'PNG saved.',
  'share.exportFailTitle': 'Export failed',
  'share.exportFailBody': 'Try again or check download permissions.',
  'account.shareCards.title': 'Share cards',
  'account.shareCards.hint': 'Image export: favorites, diary month, or Tonight shortlist.',
  'account.shareCards.open': 'Open /share',
  'account.meHub.title': 'My hub',
  'account.meHub.hint':
    'One screen: watchlist, diary, inbox, recommendations; quick search and shared movie actions.',
  'account.meHub.open': 'Open /me',

  'me.title': 'My hub',
  'me.subtitle':
    'Quick search, list previews, and recommendations. Movie actions use the shared bottom sheet.',
  'me.backAccount': 'Account',
  'me.quickAddTitle': 'Quick search',
  'me.quickAddHint': 'Opens home with the search field prefilled (2+ characters).',
  'me.quickAddPlaceholder': 'Movie title…',
  'me.quickAddCta': 'Search',
  'me.sectionWatchlist': 'Watchlist',
  'me.sectionDiary': 'Diary',
  'me.sectionInbox': 'Inbox & subscriptions',
  'me.sectionRecs': 'Recommendations',
  'me.seeAll': 'See all →',
  'me.emptyWatchlist': 'Empty — open a movie card and add it to your list.',
  'me.emptyDiary': 'No diary entries yet.',
  'me.inboxRulesPrefix': 'Local inbox rules:',
  'me.releaseSubs': 'Release subscriptions in account →',
  'me.favoritesLink': 'Favorites →',
  'me.recsLoading': 'Loading…',
  'me.recsEmpty': 'Add favorites to unlock TMDB-based recommendations.',
  'me.recsErrorCtx': 'Recommendations',
  'me.moreActions': 'More…',

  'movieActions.subtitle': 'Watchlist status, favorites, and diary logging.',
  'movieActions.openDetails': 'Open movie',
  'movieActions.cycleWatchlist': 'Watchlist status',
  'movieActions.addFavorite': 'Add to favorites',
  'movieActions.removeFavorite': 'Remove from favorites',
  'movieActions.logDiary': 'Log to diary',
  'movieActions.watchlistTitle': 'Watchlist',
  'movieActions.favoritesTitle': 'Favorites',
  'movieActions.favAdded': 'Added to favorites.',
  'movieActions.favRemoved': 'Removed from favorites.',
  'movieActions.stWant': 'Want',
  'movieActions.stWatching': 'Watching',
  'movieActions.stWatched': 'Watched',
  'movieActions.stDropped': 'Dropped',
  'movieActions.stHidden': 'Hidden',
  'movieActions.moreAria': 'More actions',
  'movieActions.like': 'Like',
  'movieActions.dislike': 'Dislike',
  'movieActions.reactionsTitle': 'Reaction',
  'movieActions.reactionSet': 'Saved.',
  'movieActions.reactionCleared': 'Cleared.',
  'movieActions.followRelease': 'Follow release',
  'movieActions.removeReleaseAlert': 'Unfollow release',
  'movieActions.releaseTitle': 'Release',
  'movieActions.releaseNoDate': 'No TMDB release date — open the movie page.',
  'movieActions.releaseSaved': 'Subscription saved (in-app).',
  'movieActions.releaseRemoved': 'Subscription removed.',
  'movieActions.releaseLoginHint': 'Sign in to follow the release date.',

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
  'details.timeline.webPush': 'Web Push (server; VAPID required)',
  'details.timeline.email': 'Email (server; SMTP required on API)',
  'details.timeline.emailHint':
    'Sends to your account email when the API has SMTP_HOST (etc.) configured.',
  'details.timeline.save': 'Save reminder',
  'details.timeline.none': 'No reminders for this title',
  'details.timeline.remove': 'Remove',
  'details.timeline.chInApp': 'in-app',
  'details.timeline.chPush': 'push',
  'details.timeline.chEmail': 'email',
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
