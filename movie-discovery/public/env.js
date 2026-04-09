/**
 * Опционально переопределяет base URL и ключ без пересборки.
 *
 * В dev (npm start) по умолчанию base URL = /tmdb (proxy на api.themoviedb.org — без CORS).
 * Не задавайте здесь полный https://api... если хотите использовать proxy.
 */
window.__env = window.__env || {};
window.__env.TMDB_API_KEY = '';
window.__env.TMDB_BASE_URL = '';
