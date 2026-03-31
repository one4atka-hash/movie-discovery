import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MovieService } from '../services/movie.service';
import { Movie } from '../models/movie.model';

@Injectable({
  providedIn: 'root'
})
export class MovieStore {
  private readonly moviesApi = inject(MovieService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _movies = signal<Movie[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedMovie = signal<Movie | null>(null);

  private readonly _query = signal<string>('');
  private readonly _page = signal<number>(1);
  private readonly _totalPages = signal<number>(1);

  readonly movies = computed(() => this._movies());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());
  readonly selectedMovie = computed(() => this._selectedMovie());

  readonly query = computed(() => this._query());
  readonly page = computed(() => this._page());
  readonly totalPages = computed(() => this._totalPages());

  search(query: string): void {
    const normalized = query.trim();

    this._query.set(normalized);
    this._page.set(1);
    this._totalPages.set(1);
    this._selectedMovie.set(null);
    this._movies.set([]);
    this._error.set(null);

    if (!normalized) {
      return;
    }

    this._loading.set(true);
    this.moviesApi
      .searchMovies(normalized, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this._movies.set(res.results ?? []);
          this._page.set(res.page ?? 1);
          this._totalPages.set(res.total_pages ?? 1);
          this._loading.set(false);
        },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Search failed');
          this._loading.set(false);
        }
      });
  }

  loadMovie(id: number): void {
    this._error.set(null);
    this._loading.set(true);

    this.moviesApi
      .getMovie(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (movie) => {
          this._selectedMovie.set(movie);
          this._loading.set(false);
        },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Load movie failed');
          this._loading.set(false);
        }
      });
  }

  loadNextPage(): void {
    const query = this._query();
    const page = this._page();
    const total = this._totalPages();

    if (!query || this._loading() || page >= total) {
      return;
    }

    const nextPage = page + 1;
    this._loading.set(true);
    this._error.set(null);

    this.moviesApi
      .searchMovies(query, nextPage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const prev = this._movies();
          this._movies.set([...prev, ...(res.results ?? [])]);
          this._page.set(res.page ?? nextPage);
          this._totalPages.set(res.total_pages ?? total);
          this._loading.set(false);
        },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Load next page failed');
          this._loading.set(false);
        }
      });
  }
}

