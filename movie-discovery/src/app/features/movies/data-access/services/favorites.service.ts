import { Injectable, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';
import { Movie } from '../models/movie.model';

const STORAGE_KEY = 'favorites.movies.v1';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly favoritesSignal = signal<Movie[]>([]);

  constructor(private readonly storage: StorageService) {
    const raw = this.storage.get<unknown>(STORAGE_KEY, []);
    const list = Array.isArray(raw) ? (raw as Movie[]) : [];
    // Defensive: keep only minimal serializable shape to avoid storage issues between versions.
    this.favoritesSignal.set(
      list.filter((m) => Boolean(m && typeof m === 'object' && 'id' in m)).map((m) => toStoredMovie(m as Movie))
    );
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
    this.storage.set(STORAGE_KEY, next.map((m) => toStoredMovie(m)));
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
    genre_ids: (m as Movie).genre_ids
  };
}

