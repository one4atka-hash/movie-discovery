/**
 * Скопируйте в `public/env.js` и подставьте свой ключ TMDB v3 (32 hex).
 * Файл `env.js` не коммитится (см. `.gitignore`).
 *
 * В dev (npm start) по умолчанию base URL = /tmdb (proxy → api.themoviedb.org).
 * Не задавайте полный https://api... если нужен proxy.
 */
window.__env = window.__env || {};
window.__env.TMDB_API_KEY = '';
window.__env.TMDB_BASE_URL = '';

/**
 * Опционально: URL вашего API для писем о релизе (вместо только mailto).
 * POST application/json, тело: { type, to, subject, text, movies: [{ tmdbId, title, releaseDate }] }.
 * Заголовок X-Webhook-Secret — если задан RELEASE_ALERT_WEBHOOK_SECRET ниже.
 * Сервер должен ответить с CORS (Access-Control-Allow-Origin) для origin приложения.
 */
window.__env.RELEASE_ALERT_WEBHOOK_URL = '';
window.__env.RELEASE_ALERT_WEBHOOK_SECRET = '';
