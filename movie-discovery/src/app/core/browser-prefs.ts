/** Общие ключи: localStorage + cookie (как у темы), чтобы настройки переживали перезагрузку и были доступны без JS-хранилища там, где нужны куки. */

export const LOCALE_STORAGE_KEY = 'app.tmdb.locale.v2';
export const LOCALE_COOKIE_NAME = 'app_tmdb_locale';
export const THEME_STORAGE_KEY = 'app.theme.v1';
export const THEME_COOKIE_NAME = 'app_theme';

const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

export function setCookie(name: string, value: string, maxAgeSec = ONE_YEAR_SEC): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};path=/;max-age=${maxAgeSec};SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=;path=/;max-age=0;SameSite=Lax`;
}

export function readStoredLocale(): string | null {
  try {
    const v2 = localStorage.getItem(LOCALE_STORAGE_KEY)?.trim();
    if (v2 && /^[a-z]{2}(-[A-Z]{2})?$/.test(v2)) return v2;
  } catch {
    /* private mode */
  }
  const c = getCookie(LOCALE_COOKIE_NAME)?.trim();
  if (c && /^[a-z]{2}(-[A-Z]{2})?$/.test(c)) return c;
  return null;
}

export function writeLocalePreference(locale: string): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  setCookie(LOCALE_COOKIE_NAME, locale);
}

export type ThemePref = 'dark' | 'light';

export function readThemePreference(): ThemePref | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)?.trim();
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  const c = getCookie(THEME_COOKIE_NAME)?.trim();
  if (c === 'light' || c === 'dark') return c;
  return null;
}

export function writeThemePreference(theme: ThemePref): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  setCookie(THEME_COOKIE_NAME, theme);
}
