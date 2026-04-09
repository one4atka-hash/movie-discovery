export const environment = {
  production: false,
  /** В ng serve запросы идут на тот же origin → proxy → TMDB (обход CORS). */
  apiBaseUrl: '/tmdb',
  /** v3 API Key (hex) с themoviedb.org/settings/api — не JWT Read Access Token */
  apiKey: ''
};

