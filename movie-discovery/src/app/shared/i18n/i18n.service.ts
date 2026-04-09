import { Injectable, computed, signal } from '@angular/core';

export type Lang = 'ru' | 'en';

const STORAGE_KEY = 'app.lang.v1';

type Dict = Record<string, string>;

const RU: Dict = {
  'nav.home': 'Главная',
  'nav.favorites': 'Избранное',
  'nav.notifications': 'Уведомления',
  'nav.account': 'Аккаунт',
  'theme.light': '☀ Светлая',
  'theme.dark': '🌙 Тёмная',
  'lang.ru': 'RU',
  'lang.en': 'EN',

  'home.title': 'Выбор фильма на вечер — быстро и без лишнего шума.',
  'home.subtitle': 'Поиск, избранное, трейлеры и бесплатный кинотеатр (public domain).',
  'home.cta.search': 'Открыть поиск',
  'home.cta.cinema': 'Бесплатный кинотеатр',
  'home.apiKeyNote': 'Для запросов к TMDB нужен API key. Задайте его в public/env.js (TMDB_API_KEY).',
  'home.showcaseTitle': 'Витрина: популярное сейчас',
  'home.showcaseLink': 'Искать по названию →',
  'home.openDetails': 'Открыть детали',

  'account.title': 'Аккаунт',
  'account.subtitle': 'Нужен для синхронизации подписок и уведомлений о релизах.',
  'account.loggedInAs': 'Вы вошли как',
  'account.myNotifications': 'Мои уведомления',
  'account.logout': 'Выйти',
  'account.login': 'Войти',
  'account.register': 'Создать аккаунт',
  'account.email': 'Email',
  'account.password': 'Пароль',
  'account.passwordHint': 'Минимум 6 символов.',

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

  'free.title': 'Бесплатный кинотеатр',
  'free.subtitle':
    'Только легальные источники: public domain / свободные лицензии. Контент берётся из Internet Archive коллекции publicdomainmovies.',
  'free.searchPlaceholder': 'Найти фильм (public domain)...',
  'free.search': 'Искать',
  'free.openSource': 'Открыть источник',
  'free.note':
    'Если видео не играет, возможно у файла другой формат/кодек. Откройте источник и выберите другой файл (MP4/WebM).',

  'details.back': '← Назад к поиску',
  'details.followRelease': 'Следить за релизом',
  'details.inFavorites': '♥ В избранном',
  'details.addToFavorites': '♡ В избранное'
};

const EN: Dict = {
  'nav.home': 'Home',
  'nav.favorites': 'Favorites',
  'nav.notifications': 'Alerts',
  'nav.account': 'Account',
  'theme.light': '☀ Light',
  'theme.dark': '🌙 Dark',
  'lang.ru': 'RU',
  'lang.en': 'EN',

  'home.title': 'Pick a movie for tonight — fast and distraction-free.',
  'home.subtitle': 'Search, favorites, trailers, and a free public-domain cinema section.',
  'home.cta.search': 'Open search',
  'home.cta.cinema': 'Free cinema',
  'home.apiKeyNote': 'TMDB API key is required. Set it in public/env.js (TMDB_API_KEY).',
  'home.showcaseTitle': 'Trending now',
  'home.showcaseLink': 'Search by title →',
  'home.openDetails': 'Open details',

  'account.title': 'Account',
  'account.subtitle': 'Required for syncing release alerts and reminders.',
  'account.loggedInAs': 'Signed in as',
  'account.myNotifications': 'My alerts',
  'account.logout': 'Log out',
  'account.login': 'Sign in',
  'account.register': 'Create account',
  'account.email': 'Email',
  'account.password': 'Password',
  'account.passwordHint': 'At least 6 characters.',

  'notifications.title': 'Release alerts',
  'notifications.subtitle': 'Track a movie and get a reminder on release day (choose your channel).',
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

  'free.title': 'Free cinema',
  'free.subtitle':
    'Legal sources only: public domain / free licenses. Content is pulled from Internet Archive’s publicdomainmovies collection.',
  'free.searchPlaceholder': 'Search a public-domain movie...',
  'free.search': 'Search',
  'free.openSource': 'Open source',
  'free.note':
    'If playback fails, this item may use a different codec/format. Open the source and pick another file (MP4/WebM).',

  'details.back': '← Back to search',
  'details.followRelease': 'Follow release',
  'details.inFavorites': '♥ In favorites',
  'details.addToFavorites': '♡ Add to favorites'
};

function normalizeLang(v: unknown): Lang {
  return v === 'en' || v === 'ru' ? v : 'ru';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang = signal<Lang>(normalizeLang(localStorage.getItem(STORAGE_KEY)));
  readonly lang = this._lang.asReadonly();

  readonly dict = computed(() => (this._lang() === 'en' ? EN : RU));

  setLang(next: Lang): void {
    this._lang.set(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }

  toggleLang(): void {
    this.setLang(this._lang() === 'ru' ? 'en' : 'ru');
  }

  t(key: string): string {
    return this.dict()[key] ?? key;
  }
}

