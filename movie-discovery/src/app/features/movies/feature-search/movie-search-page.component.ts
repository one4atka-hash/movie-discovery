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
        <p class="page__subtitle">Введите минимум 2 символа — покажем совпадения из TMDB.</p>
      </header>

      <div class="welcome" *ngIf="showHero()">
        <div class="welcome__inner">
          <p class="welcome__kicker">Домашний каталог</p>
          <h3 class="welcome__title">Найдите фильм за пару секунд</h3>
          <p class="welcome__text">
            Подсказки ниже — быстрый старт. Или введите свой запрос: жанр, год, часть названия.
          </p>
          <div class="welcome__chips" role="group" aria-label="Быстрый поиск">
            <button type="button" class="chip" (click)="pickSuggestion('Inception')">Inception</button>
            <button type="button" class="chip" (click)="pickSuggestion('The Matrix')">The Matrix</button>
            <button type="button" class="chip" (click)="pickSuggestion('Dune')">Dune</button>
            <button type="button" class="chip" (click)="pickSuggestion('Interstellar')">Interstellar</button>
          </div>
        </div>
      </div>

      <div class="search">
        <input
          class="search__input"
          [formControl]="queryControl"
          placeholder="Например: Inception"
          autocomplete="off"
          aria-label="Поиск фильма"
        />
      </div>

      <div class="skeleton-grid" *ngIf="loading() && !showHero()">
        <div class="skeleton-card" *ngFor="let _ of skeletonSlots; trackBy: trackByIndex"></div>
      </div>

      <app-empty-state
        *ngIf="!showHero() && !loading() && error()"
        title="Ошибка"
        [subtitle]="error()"
      />

      <app-empty-state
        *ngIf="!showHero() && !loading() && !error() && showEmpty()"
        title="Ничего не найдено"
        subtitle="Попробуйте другой запрос."
      />

      <div class="grid" *ngIf="!showHero() && !loading() && !error() && movies().length">
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

      .welcome {
        margin: 0 0 1rem;
        border-radius: 18px;
        border: 1px solid var(--border-subtle);
        background:
          radial-gradient(1200px 400px at 10% 0%, rgba(255, 107, 107, 0.18), transparent 55%),
          radial-gradient(900px 360px at 90% 20%, rgba(255, 195, 113, 0.14), transparent 50%),
          rgba(255, 255, 255, 0.03);
        padding: 1.1rem 1.15rem;
      }
      .welcome__inner {
        max-width: 52rem;
      }
      .welcome__kicker {
        margin: 0 0 0.35rem;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .welcome__title {
        margin: 0 0 0.5rem;
        font-size: 1.25rem;
        line-height: 1.25;
      }
      .welcome__text {
        margin: 0 0 0.85rem;
        line-height: 1.55;
        color: var(--text-muted);
      }
      .welcome__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .chip {
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.25);
        color: var(--text);
        padding: 0.45rem 0.75rem;
        font: inherit;
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
      }
      .chip:hover {
        transform: translateY(-1px);
        border-color: rgba(255, 195, 113, 0.45);
        background: rgba(255, 195, 113, 0.1);
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

  /** Слоты для skeleton — отдельный массив, чтобы strict шаблон не ругался на литералы в *ngFor */
  readonly skeletonSlots = [0, 1, 2, 3, 4, 5] as const;

  private readonly _movies = signal<Movie[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _hasSearched = signal(false);
  private readonly _query = signal<string>('');
  private readonly _page = signal(1);
  private readonly _totalPages = signal(1);
  private readonly _draft = signal('');

  readonly movies = computed(() => this._movies());
  readonly loading = computed(() => this._loading());
  readonly loadingMore = computed(() => this._loadingMore());
  readonly error = computed(() => this._error());
  readonly showHero = computed(() => this._draft().trim().length < 2);
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
    this._draft.set(this.queryControl.value);
    this.queryControl.valueChanges
      .pipe(
        tap((q) => this._draft.set(q)),
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

  trackByIndex(i: number): number {
    return i;
  }

  pickSuggestion(value: string): void {
    this.queryControl.setValue(value);
  }
}

