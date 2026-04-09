import { HttpErrorResponse } from '@angular/common/http';

/** Типичные коды ошибок TMDB API (см. документацию themoviedb.org) */
const TMDB_INVALID_KEY_CODES = new Set([7, 8]);

interface TmdbErrorBody {
  status_code?: number;
  status_message?: string;
  success?: boolean;
}

function parseErrorBody(err: HttpErrorResponse): TmdbErrorBody | undefined {
  const raw = err.error;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as TmdbErrorBody;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as TmdbErrorBody;
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

/**
 * Человекочитаемое описание ошибки HTTP/TMDB для UI и тостов.
 */
export function friendlyHttpErrorMessage(err: unknown, context = 'Запрос к TMDB'): string {
  if (err instanceof HttpErrorResponse) {
    const status = err.status;
    const rawErr = err.error;
    if (
      rawErr &&
      typeof rawErr === 'object' &&
      !Array.isArray(rawErr) &&
      'tmdbNonJson' in rawErr &&
      (rawErr as { tmdbNonJson?: boolean }).tmdbNonJson === true
    ) {
      return [
        'Сервер вернул не JSON при HTTP 200 (часто HTML вместо ответа TMDB).',
        'Локально: запускайте `npm start` из `movie-discovery`, в `angular.json` должен быть `proxyConfig` → `proxy.conf.json`, в `public/env.js` не задавайте полный `https://api.themoviedb.org`, если используете префикс `/tmdb`.',
        'Иначе проверьте сеть или блокировку доступа к api.themoviedb.org.'
      ].join(' ');
    }
    const httpMessage = err.message?.trim() ?? '';
    if (status === 200 && /Http failure during parsing/i.test(httpMessage)) {
      return [
        'Сервер вернул не JSON при HTTP 200 (часто HTML вместо ответа TMDB).',
        'Локально: запускайте `npm start` из `movie-discovery`, в `angular.json` должен быть `proxyConfig` → `proxy.conf.json`, в `public/env.js` не задавайте полный `https://api.themoviedb.org`, если используете префикс `/tmdb`.',
        'Иначе проверьте сеть или блокировку доступа к api.themoviedb.org.'
      ].join(' ');
    }
    const tmdb = parseErrorBody(err);
    const code = tmdb?.status_code;
    const msg = tmdb?.status_message?.trim();

    if (msg) {
      if (status === 401 || TMDB_INVALID_KEY_CODES.has(code ?? -1) || /invalid api key/i.test(msg)) {
        return [
          'Неверный или неактивный API-ключ TMDB.',
          'Получите ключ на themoviedb.org (Settings → API), затем:',
          '• локально: файл `movie-discovery/public/env.js` (скопируйте из `env.example.js`) или переменная `TMDB_API_KEY` при сборке;',
          '• прод: переменная окружения `TMDB_API_KEY` на хостинге.',
          `Ответ API: ${msg}`
        ].join(' ');
      }
      if (code === 25 || /request limit/i.test(msg)) {
        return `Лимит запросов TMDB: ${msg}. Подождите и повторите.`;
      }
      return `${context}: ${msg}`;
    }

    if (status === 0) {
      return [
        'Нет сети или запрос заблокирован (часто CORS при прямом вызове TMDB из браузера).',
        'Локально: запускайте npm start и используйте apiBaseUrl /tmdb через proxy (proxy.conf.json).',
        'Не задавайте в public/env.js полный https://api.themoviedb.org, если нужен proxy.'
      ].join(' ');
    }
    if (status === 401 || status === 403) {
      return 'Доступ отклонён (401/403). Обычно это неверный API-ключ TMDB — проверьте `public/env.js` или переменную TMDB_API_KEY.';
    }
    if (status === 429) {
      return 'Слишком много запросов к TMDB (429). Подождите минуту и повторите.';
    }
    if (status >= 500) {
      return `Сервер TMDB временно недоступен (HTTP ${status}). Попробуйте позже.`;
    }
    if (status === 404) {
      return [
        'Метод API не найден (404). Часто это запрос к `/tmdb/...` без прокси (статический хост не знает такого пути).',
        'Локально: `npm start` в каталоге `movie-discovery` (proxy из `proxy.conf.json`).',
        'Прод: правила в `vercel.json` или `netlify.toml` в корне проекта, либо полный URL TMDB в `public/env.js` (возможен CORS).',
        'Примечание: блокировка CORS в браузере обычно даёт status 0, не 404.'
      ].join(' ');
    }

    const detail = err.message?.trim() || err.statusText?.trim();
    return detail ? `${context}: HTTP ${status} — ${detail}` : `${context}: HTTP ${status}`;
  }

  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.length) return m;
  }
  return 'Неизвестная ошибка. Откройте консоль браузера (F12) для подробностей.';
}
