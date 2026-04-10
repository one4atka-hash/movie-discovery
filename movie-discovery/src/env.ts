export {};

declare global {
  interface Window {
    readonly __env?: {
      readonly TMDB_API_KEY?: string;
      readonly TMDB_BASE_URL?: string;
      /** POST JSON на ваш бэкенд для отправки письма (см. комментарий в env.example.js). */
      readonly RELEASE_ALERT_WEBHOOK_URL?: string;
      readonly RELEASE_ALERT_WEBHOOK_SECRET?: string;
    };
  }
}
