import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import { ConfigService } from '@core/config.service';
import { Movie, MovieSearchResponse, MovieVideosResponse } from '../models/movie.model';

interface CacheEntry<T> {
  readonly timestamp: number;
  readonly stream: Observable<T>;
}

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly cacheTtlMs = 1000 * 60 * 5;

  searchMovies(query: string, page = 1): Observable<MovieSearchResponse> {
    const normalizedQuery = query.trim();
    const cacheKey = `search:${normalizedQuery}:${page}`;

    return this.getOrCreate<MovieSearchResponse>(cacheKey, () => {
      const params = new HttpParams()
        .set('query', normalizedQuery)
        .set('page', String(page))
        .set('api_key', this.config.api.apiKey ?? '');

      const url = `${this.config.api.baseUrl}/search/movie`;
      return this.getJson<MovieSearchResponse>(url, params);
    });
  }

  /** Популярные фильмы (для витрины на стартовом экране и т.п.). */
  getPopularMovies(page = 1): Observable<MovieSearchResponse> {
    const cacheKey = `popular:${page}`;

    return this.getOrCreate<MovieSearchResponse>(cacheKey, () => {
      const params = new HttpParams()
        .set('page', String(page))
        .set('api_key', this.config.api.apiKey ?? '');

      const url = `${this.config.api.baseUrl}/movie/popular`;
      return this.getJson<MovieSearchResponse>(url, params);
    });
  }

  getMovie(id: number): Observable<Movie> {
    const cacheKey = `movie:${id}`;

    return this.getOrCreate<Movie>(cacheKey, () => {
      const params = new HttpParams().set('api_key', this.config.api.apiKey ?? '');
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

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * HttpClient JSON mode throws «Http failure during parsing» when the body is HTML (e.g. SPA index)
   * or non-JSON. We read text and parse explicitly to surface a clear error via HttpErrorResponse.
   */
  private getJson<T>(url: string, params: HttpParams): Observable<T> {
    return this.http.get(url, { params, responseType: 'text' }).pipe(
      map((text) => this.parseTmdbJson<T>(text, url))
    );
  }

  private parseTmdbJson<T>(text: string, url: string): T {
    const t = text.trim();
    if (t.length === 0) {
      throw new HttpErrorResponse({ status: 502, statusText: 'Empty body', url });
    }
    const head = t.slice(0, 12).toLowerCase();
    if (t.startsWith('<!') || head.startsWith('<html')) {
      throw new HttpErrorResponse({
        status: 200,
        statusText: 'OK',
        url,
        error: { tmdbNonJson: true }
      });
    }
    try {
      return JSON.parse(t) as T;
    } catch {
      throw new HttpErrorResponse({
        status: 200,
        statusText: 'OK',
        url,
        error: { tmdbNonJson: true }
      });
    }
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

