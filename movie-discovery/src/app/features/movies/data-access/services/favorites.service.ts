import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

import { StorageService } from '@core/storage.service';
import { I18nService } from '@shared/i18n/i18n.service';
import { Movie } from '../models/movie.model';
import { MovieService } from './movie.service';

const STORAGE_KEY = 'favorites.movies.v1';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly i18n = inject(I18nService);
  private readonly moviesApi = inject(MovieService);
  private readonly favoritesSignal = signal<Movie[]>([]);
  private localeRefreshN = 0;

  constructor(private readonly storage: StorageService) {
    const raw = this.storage.get<unknown>(STORAGE_KEY, []);
    const list = Array.isArray(raw) ? (raw as Movie[]) : [];
    // Defensive: keep only minimal serializable shape to avoid storage issues between versions.
    this.favoritesSignal.set(
      list
        .filter((m) => Boolean(m && typeof m === 'object' && 'id' in m))
        .map((m) => toStoredMovie(m as Movie)),
    );

    // When TMDB locale changes, refresh stored titles/overviews for favorites.
    // This keeps Favorites / previews in sync with the selected TMDB language.
    effect(() => {
      this.i18n.tmdbLocale();
      if (this.localeRefreshN++ === 0) return;
      untracked(() => this.refreshFromTmdb());
    });
  }

  readonly favorites = this.favoritesSignal.asReadonly();

  has(movieId: number): boolean {
    return this.favoritesSignal().some((m) => m.id === movieId);
  }

  toggle(movie: Movie): void {
    if (this.has(movie.id)) {
      this.remove(movie.id);
      return;
    }
    this.add(movie);
  }

  add(movie: Movie): void {
    const current = this.favoritesSignal();
    if (current.some((m) => m.id === movie.id)) return;
    const next = [toStoredMovie(movie), ...current.map((m) => toStoredMovie(m))];
    this.persist(next);
  }

  remove(movieId: number): void {
    const next = this.favoritesSignal().filter((m) => m.id !== movieId);
    this.persist(next);
  }

  private persist(next: Movie[]): void {
    this.favoritesSignal.set(next);
    // Always persist a minimal shape to avoid JSON issues with expanded objects.
    this.storage.set(
      STORAGE_KEY,
      next.map((m) => toStoredMovie(m)),
    );
  }

  private refreshFromTmdb(): void {
    const cur = this.favoritesSignal();
    const ids = cur.map((m) => m.id).filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) return;

    forkJoin(
      ids.map((id) =>
        this.moviesApi.getMovie(id).pipe(
          catchError(() => {
            // Fallback to stored snapshot if TMDB request fails.
            const stored = cur.find((m) => m.id === id);
            return of(stored ?? null);
          }),
        ),
      ),
    ).subscribe((movies) => {
      const next = movies
        .filter((m): m is Movie => Boolean(m))
        .map((m) => toStoredMovie(m))
        .sort((a, b) => b.id - a.id); // keep deterministic; "newest first" is handled by add()
      this.persist(next);
    });
  }
}

function toStoredMovie(m: Movie): Movie {
  return {
    id: Number(m.id),
    title: String(m.title ?? ''),
    poster_path: m.poster_path ?? null,
    backdrop_path: (m as Movie).backdrop_path ?? null,
    release_date: String((m as Movie).release_date ?? ''),
    vote_average: Number((m as Movie).vote_average ?? 0),
    overview: String((m as Movie).overview ?? ''),
    genre_ids: (m as Movie).genre_ids,
  };
}
