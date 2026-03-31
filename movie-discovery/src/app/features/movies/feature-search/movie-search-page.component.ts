import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Movie } from '../data-access/models/movie.model';
import { MovieService } from '../data-access/services/movie.service';
import { LoaderComponent } from '@shared/ui/loader/loader.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { MovieCardComponent } from '../ui/movie-card/movie-card.component';
import { InfiniteScrollDirective } from '@shared/directives/infinite-scroll.directive';

@Component({
  selector: 'app-movie-search-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LoaderComponent,
    EmptyStateComponent,
    MovieCardComponent,
    InfiniteScrollDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page__header">
        <h2 class="page__title">Поиск</h2>
        <p class="page__subtitle">Введите минимум 2 символа.</p>
      </header>

      <div class="search">
        <input
          class="search__input"
          [formControl]="queryControl"
          placeholder="Например: Inception"
          autocomplete="off"
        />
      </div>

      <app-loader *ngIf="loading()"></app-loader>

      <div class="skeleton-grid" *ngIf="loading()">
        <div class="skeleton-card" *ngFor="let i of [1, 2, 3, 4, 5, 6]"></div>
      </div>

      <app-empty-state
        *ngIf="!loading() && error()"
        title="Ошибка"
        [subtitle]="error()"
      />

      <app-empty-state
        *ngIf="!loading() && !error() && showEmpty()"
        title="Ничего не найдено"
        subtitle="Попробуйте другой запрос."
      />

      <div class="grid" *ngIf="!loading() && !error() && movies().length">
        <a class="grid__item" *ngFor="let m of movies(); trackBy: trackById" [routerLink]="['/movie', m.id]">
          <app-movie-card [movie]="m" />
        </a>
      </div>

      <div class="more" *ngIf="loadingMore()">
        <app-loader />
      </div>

      <div
        class="sentinel"
        appInfiniteScroll
        [disabled]="!canLoadMore()"
        (reached)="loadNextPage()"
      ></div>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
      }
      .page__header {
        margin-bottom: 1rem;
      }
      .page__title {
        margin: 0 0 0.25rem;
      }
      .page__subtitle {
        margin: 0;
        opacity: 0.7;
      }

      .search {
        margin: 0.75rem 0 0.5rem;
      }
      .search__input {
        width: 100%;
        padding: 0.9rem 1rem;
        border-radius: 14px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
        color: var(--text);
        outline: none;
      }
      .search__input:focus {
        border-color: rgba(255, 107, 107, 0.45);
        box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.12);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
        margin-top: 1rem;
      }
      .grid__item {
        text-decoration: none;
        color: inherit;
      }
      .grid__item:hover {
        transform: translateY(-2px);
        transition: transform 0.18s ease;
      }

      .skeleton-grid {
        margin-top: 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
      }
      .skeleton-card {
        height: 300px;
        border-radius: 14px;
        background: linear-gradient(
          100deg,
          rgba(255, 255, 255, 0.06) 20%,
          rgba(255, 255, 255, 0.16) 35%,
          rgba(255, 255, 255, 0.06) 50%
        );
        background-size: 200% 100%;
        animation: shimmer 1.25s linear infinite;
      }

      .more {
        margin-top: 1rem;
      }

      .sentinel {
        height: 1px;
      }

      @keyframes shimmer {
        to {
          background-position-x: -200%;
        }
      }
    `
  ]
})
export class MovieSearchPageComponent {
  private readonly api = inject(MovieService);
  private readonly destroyRef = inject(DestroyRef);

  readonly queryControl = new FormControl<string>('', { nonNullable: true });

  private readonly _movies = signal<Movie[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _hasSearched = signal(false);
  private readonly _query = signal<string>('');
  private readonly _page = signal(1);
  private readonly _totalPages = signal(1);

  readonly movies = computed(() => this._movies());
  readonly loading = computed(() => this._loading());
  readonly loadingMore = computed(() => this._loadingMore());
  readonly error = computed(() => this._error());
  readonly showEmpty = computed(() => this._hasSearched() && this._movies().length === 0);
  readonly canLoadMore = computed(
    () =>
      this._hasSearched() &&
      !this._loading() &&
      !this._loadingMore() &&
      !this._error() &&
      this._movies().length > 0 &&
      this._page() < this._totalPages()
  );

  constructor() {
    this.queryControl.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        tap(() => {
          this._error.set(null);
        }),
        filter((q) => q.trim().length >= 2),
        tap(() => {
          this._hasSearched.set(true);
          this._loading.set(true);
          this._loadingMore.set(false);
        }),
        switchMap((q) => this.api.searchMovies(q.trim(), 1)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this._movies.set(res.results ?? []);
          this._query.set(this.queryControl.value.trim());
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

  loadNextPage(): void {
    if (!this.canLoadMore()) return;
    const nextPage = this._page() + 1;
    const query = this._query();

    this._loadingMore.set(true);
    this._error.set(null);

    this.api
      .searchMovies(query, nextPage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this._movies.set([...this._movies(), ...(res.results ?? [])]);
          this._page.set(res.page ?? nextPage);
          this._totalPages.set(res.total_pages ?? this._totalPages());
          this._loadingMore.set(false);
        },
        error: (err: unknown) => {
          this._error.set(err instanceof Error ? err.message : 'Load next page failed');
          this._loadingMore.set(false);
        }
      });
  }

  trackById(_: number, m: Movie): number {
    return m.id;
  }
}

