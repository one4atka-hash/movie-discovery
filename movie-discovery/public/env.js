/**
 * Опционально переопределяет ключ без пересборки (прод или локально).
 * Оставьте TMDB_API_KEY пустым — тогда возьмётся ключ из environment.ts (dev).
 *
 * Сюда нужен только v3 API Key (hex), НЕ JWT из панели TMDB.
 */
window.__env = window.__env || {};
window.__env.TMDB_API_KEY = '';
window.__env.TMDB_BASE_URL = 'https://api.themoviedb.org/3';
