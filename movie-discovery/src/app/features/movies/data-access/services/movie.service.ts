import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, effect, inject, untracked } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import { ConfigService } from '@core/config.service';
import { I18nService } from '@shared/i18n/i18n.service';
import { parseTmdbJsonText } from '@core/tmdb-http.util';
import { Movie, MovieSearchResponse, MovieVideosResponse } from '../models/movie.model';
import { TmdbWatchProvidersResponse } from '../models/watch-providers.model';

interface CacheEntry<T> {
  readonly timestamp: number;
  readonly stream: Observable<T>;
}

@Injectable({
  providedIn: 'root',
})
export class MovieService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly i18n = inject(I18nService);

  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly cacheTtlMs = 1000 * 60 * 5;

  private lastTmdbLocale = '';

  constructor() {
    effect(() => {
      const loc = this.i18n.tmdbLocale();
      untracked(() => {
        if (this.lastTmdbLocale && this.lastTmdbLocale !== loc) {
          this.cache.clear();
        }
        this.lastTmdbLocale = loc;
      });
    });
  }

  private baseParams(): HttpParams {
    return new HttpParams().set('api_key', this.config.api.apiKey ?? '');
  }

  searchMovies(query: string, page = 1): Observable<MovieSearchResponse> {
    const normalizedQuery = query.trim();
    const lang = this.i18n.tmdbLocale();
    const cacheKey = `search:${lang}:${normalizedQuery}:${page}`;

    return this.getOrCreate<MovieSearchResponse>(cacheKey, () => {
      const params = this.baseParams().set('query', normalizedQuery).set('page', String(page));

      const url = `${this.config.api.baseUrl}/search/movie`;
      return this.getJson<MovieSearchResponse>(url, params);
    });
  }

  /** Популярные фильмы (для витрины на стартовом экране и т.п.). */
  getPopularMovies(page = 1): Observable<MovieSearchResponse> {
    const lang = this.i18n.tmdbLocale();
    const cacheKey = `popular:${lang}:${page}`;

    return this.getOrCreate<MovieSearchResponse>(cacheKey, () => {
      const params = this.baseParams().set('page', String(page));

      const url = `${this.config.api.baseUrl}/movie/popular`;
      return this.getJson<MovieSearchResponse>(url, params);
    });
  }

  /** Сейчас в кино (для блока «новинки» на главной). */
  getNowPlayingMovies(page = 1): Observable<MovieSearchResponse> {
    const lang = this.i18n.tmdbLocale();
    const cacheKey = `now_playing:${lang}:${page}`;

    return this.getOrCreate<MovieSearchResponse>(cacheKey, () => {
      const params = this.baseParams().set('page', String(page));

      const url = `${this.config.api.baseUrl}/movie/now_playing`;
      return this.getJson<MovieSearchResponse>(url, params);
    });
  }

  getMovie(id: number): Observable<Movie> {
    const lang = this.i18n.tmdbLocale();
    const cacheKey = `movie:${lang}:${id}`;

    return this.getOrCreate<Movie>(cacheKey, () => {
      const params = this.baseParams();
      const url = `${this.config.api.baseUrl}/movie/${id}`;
      return this.getJson<Movie>(url, params);
    });
  }

  getMovieVideos(id: number): Observable<MovieVideosResponse> {
    const cacheKey = `movie:videos:${id}`;

    return this.getOrCreate<MovieVideosResponse>(cacheKey, () => {
      const params = new HttpParams().set('api_key', this.config.api.apiKey ?? '');
      const url = `${this.config.api.baseUrl}/movie/${id}/videos`;
      return this.getJson<MovieVideosResponse>(url, params);
    });
  }

  getMovieWatchProviders(id: number): Observable<TmdbWatchProvidersResponse> {
    const lang = this.i18n.tmdbLocale();
    const cacheKey = `movie:providers:${lang}:${id}`;
    return this.getOrCreate<TmdbWatchProvidersResponse>(cacheKey, () => {
      const params = this.baseParams();
      const url = `${this.config.api.baseUrl}/movie/${id}/watch/providers`;
      return this.getJson<TmdbWatchProvidersResponse>(url, params);
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * HttpClient JSON mode throws «Http failure during parsing» when the body is HTML (e.g. SPA index)
   * or non-JSON. We read text and parse explicitly to surface a clear error via HttpErrorResponse.
   */
  private getJson<T>(url: string, params: HttpParams): Observable<T> {
    return this.http
      .get(url, { params, responseType: 'text' })
      .pipe(map((text) => parseTmdbJsonText<T>(text, url)));
  }

  private getOrCreate<T>(key: string, factory: () => Observable<T>): Observable<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    if (cached && now - cached.timestamp < this.cacheTtlMs) {
      return cached.stream;
    }

    const stream = factory().pipe(shareReplay(1));
    this.cache.set(key, { timestamp: now, stream });
    return stream;
  }
}
