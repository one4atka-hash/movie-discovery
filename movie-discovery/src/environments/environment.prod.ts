export const environment = {
  production: true,
  /**
   * Тот же префикс, что в dev: браузер бьёт в тот же origin → прокси на TMDB (без CORS).
   * ng serve: proxy.conf.json. Netlify/Vercel: netlify.toml / vercel.json в корне проекта.
   * Иначе задайте полный URL в public/env.js (TMDB_BASE_URL) — возможен CORS у TMDB.
   */
  apiBaseUrl: '/tmdb',
  apiKey: ''
};

