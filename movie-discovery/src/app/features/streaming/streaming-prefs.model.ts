export interface StreamingPrefs {
  /** ISO 3166-1 alpha-2 country code (e.g., US, RU). */
  readonly region: string;
  /**
   * Provider names as shown by TMDB watch/providers (e.g., "Netflix", "Amazon Prime Video").
   * MVP: free-form strings matched case-insensitively.
   */
  readonly providers: readonly string[];
}
