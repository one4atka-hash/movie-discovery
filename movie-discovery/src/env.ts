export {};

declare global {
  interface Window {
    readonly __env?: {
      readonly TMDB_API_KEY?: string;
      readonly TMDB_BASE_URL?: string;
    };
  }
}
