export interface TmdbWatchProvidersResponse {
  readonly id: number;
  readonly results: Record<string, TmdbWatchProviderCountry | undefined>;
}

export interface TmdbWatchProviderCountry {
  /** Link to TMDB's watch page (often JustWatch-powered). */
  readonly link?: string;
  readonly flatrate?: readonly TmdbWatchProvider[];
  readonly rent?: readonly TmdbWatchProvider[];
  readonly buy?: readonly TmdbWatchProvider[];
}

export interface TmdbWatchProvider {
  readonly provider_id: number;
  readonly provider_name: string;
  readonly logo_path: string | null;
  readonly display_priority: number;
}

