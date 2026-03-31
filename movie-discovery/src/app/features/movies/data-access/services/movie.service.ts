import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { ConfigService } from '@core/config.service';
import { Movie, MovieSearchResponse } from '../models/movie.model';

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

      return this.http.get<MovieSearchResponse>(`${this.config.api.baseUrl}/search/movie`, {
        params
      });
    });
  }

  getMovie(id: number): Observable<Movie> {
    const cacheKey = `movie:${id}`;

    return this.getOrCreate<Movie>(cacheKey, () => {
      const params = new HttpParams().set('api_key', this.config.api.apiKey ?? '');
      return this.http.get<Movie>(`${this.config.api.baseUrl}/movie/${id}`, { params });
    });
  }

  clearCache(): void {
    this.cache.clear();
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

