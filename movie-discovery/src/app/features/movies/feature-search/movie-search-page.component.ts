import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
  tap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConfigService } from '@core/config.service';
import { friendlyHttpErrorMessage } from '@core/http-error.util';
import { Movie, MovieSearchResponse } from '../data-access/models/movie.model';
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

      <div class="api-warning" *ngIf="!hasTmdbApiKey" role="status">
        <strong>Ключ TMDB не задан.</strong>
        Укажите его в файле <code>public/env.js</code> (поле <code>TMDB_API_KEY</code>) или в переменных окружения при сборке.
        Ключ выдаётся бесплатно на
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer noopener">themoviedb.org → Settings → API</a>.
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

      <div class="welcome" *ngIf="showHero()">
        <div class="welcome__inner">
          <p class="welcome__kicker">Домашний каталог</p>
          <h3 class="welcome__title">Найдите фильм за пару секунд</h3>

          <div class="spotlight">
            <div class="spotlight__strip" *ngIf="spotlightLoading()">
              <div class="spotlight__skel" *ngFor="let _ of spotlightSkeletonSlots; trackBy: trackByIndex"></div>
            </div>

            <div class="spotlight__strip" *ngIf="!spotlightLoading() && spotlight().length">
              <a
                class="spotlight__tile"
                *ngFor="let m of spotlight(); trackBy: trackById"
                [routerLink]="['/movie', m.id]"
              >
                <div class="spotlight__poster" [class.spotlight__poster--empty]="!m.poster_path">
                  <img
                    *ngIf="m.poster_path as p"
                    class="spotlight__img"
                    [src]="posterUrl(p)"
                    [alt]="m.title"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span class="spotlight__name">{{ m.title }}</span>
              </a>
            </div>

            <p class="spotlight__err" *ngIf="!spotlightLoading() && spotlightError()" role="status">
              {{ spotlightError() }}
            </p>
          </div>

          <div class="welcome__chips" role="group" aria-label="Быстрый поиск">
            <button type="button" class="chip" (click)="pickSuggestion('Inception')">Inception</button>
            <button type="button" class="chip" (click)="pickSuggestion('The Matrix')">The Matrix</button>
            <button type="button" class="chip" (click)="pickSuggestion('Dune')">Dune</button>
            <button type="button" class="chip" (click)="pickSuggestion('Interstellar')">Interstellar</button>
          </div>
        </div>
      </div>

      <div class="skeleton-grid" *ngIf="loading() && !showHero()">
        <div class="skeleton-card" *ngFor="let _ of skeletonSlots; trackBy: trackByIndex"></div>
      </div>

      <app-empty-state
        *ngIf="!showHero() && !loading() && error()"
        title="Ошибка запроса"
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
        margin-bottom: 0.75rem;
      }
      .page__title {
        margin: 0 0 0.25rem;
      }
      .page__subtitle {
        margin: 0;
        opacity: 0.7;
      }

      .api-warning {
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
        border-radius: 14px;
        border: 1px solid rgba(255, 195, 113, 0.38);
        background: rgba(255, 195, 113, 0.09);
        color: var(--text);
        font-size: 0.9rem;
        line-height: 1.45;
      }
      .api-warning code {
        font-size: 0.86em;
        padding: 0.1em 0.35em;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.25);
      }
      .api-warning a {
        color: #ffc371;
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
        margin: 0 0 1rem;
        font-size: 1.25rem;
        line-height: 1.25;
      }

      .spotlight {
        margin: 0 0 1.1rem;
        padding: 0;
      }
      .spotlight__strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.65rem;
      }
      @media (min-width: 520px) {
        .spotlight__strip {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
      }
      .spotlight__tile {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        text-decoration: none;
        color: inherit;
        border-radius: 14px;
        padding: 0.2rem;
        margin: -0.2rem;
        transition: transform 0.2s ease, filter 0.2s ease;
      }
      .spotlight__tile:hover {
        transform: translateY(-3px);
        filter: brightness(1.06);
      }
      .spotlight__tile:focus-visible {
        outline: 2px solid rgba(255, 195, 113, 0.55);
        outline-offset: 3px;
      }
      .spotlight__poster {
        aspect-ratio: 2 / 3;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
      }
      .spotlight__poster--empty {
        background: linear-gradient(145deg, rgba(255, 107, 107, 0.2), rgba(255, 195, 113, 0.12));
      }
      .spotlight__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .spotlight__name {
        font-size: 0.78rem;
        line-height: 1.25;
        color: var(--text-muted);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .spotlight__skel {
        aspect-ratio: 2 / 3;
        border-radius: 12px;
        border: 1px solid var(--border-subtle);
        background: linear-gradient(
          100deg,
          rgba(255, 255, 255, 0.06) 20%,
          rgba(255, 255, 255, 0.14) 38%,
          rgba(255, 255, 255, 0.06) 56%
        );
        background-size: 200% 100%;
        animation: shimmer 1.25s linear infinite;
      }
      .spotlight__err {
        margin: 0.5rem 0 0;
        font-size: 0.88rem;
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
        margin: 0 0 1rem;
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
  private readonly config = inject(ConfigService);
  private readonly destroyRef = inject(DestroyRef);

  /** Есть ли ключ для запросов к TMDB (env / window.__env). */
  get hasTmdbApiKey(): boolean {
    return Boolean(this.config.api.apiKey);
  }

  readonly queryControl = new FormControl<string>('', { nonNullable: true });

  /** Слоты для skeleton — отдельный массив, чтобы strict шаблон не ругался на литералы в *ngFor */
  readonly skeletonSlots = [0, 1, 2, 3, 4, 5] as const;
  readonly spotlightSkeletonSlots = [0, 1, 2, 3, 4, 5] as const;

  private readonly _movies = signal<Movie[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _hasSearched = signal(false);
  private readonly _query = signal<string>('');
  private readonly _page = signal(1);
  private readonly _totalPages = signal(1);
  private readonly _draft = signal('');

  private readonly _spotlight = signal<Movie[]>([]);
  private readonly _spotlightLoading = signal(true);
  private readonly _spotlightError = signal<string | null>(null);

  readonly movies = computed(() => this._movies());
  readonly loading = computed(() => this._loading());
  readonly loadingMore = computed(() => this._loadingMore());
  readonly error = computed(() => this._error());
  readonly spotlight = computed(() => this._spotlight());
  readonly spotlightLoading = computed(() => this._spotlightLoading());
  readonly spotlightError = computed(() => this._spotlightError());
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
    this.loadSpotlight();
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
        switchMap((q) =>
          this.api.searchMovies(q.trim(), 1).pipe(
            catchError((err: unknown) => {
              this._error.set(friendlyHttpErrorMessage(err, 'Поиск'));
              this._loading.set(false);
              return of(EMPTY_SEARCH_RESPONSE);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this._movies.set(res.results ?? []);
          this._query.set(this.queryControl.value.trim());
          this._page.set(res.page ?? 1);
          this._totalPages.set(res.total_pages ?? 1);
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
      .pipe(
        catchError((err: unknown) => {
          this._error.set(friendlyHttpErrorMessage(err, 'Подгрузка страницы'));
          this._loadingMore.set(false);
          return of({
            page: nextPage,
            results: [] as Movie[],
            total_pages: this._totalPages(),
            total_results: 0
          } satisfies MovieSearchResponse);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this._movies.set([...this._movies(), ...(res.results ?? [])]);
          this._page.set(res.page ?? nextPage);
          this._totalPages.set(res.total_pages ?? this._totalPages());
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

  posterUrl(path: string): string {
    return `https://image.tmdb.org/t/p/w342${path}`;
  }

  private loadSpotlight(): void {
    this._spotlightLoading.set(true);
    this._spotlightError.set(null);
    const page = Math.floor(Math.random() * 10) + 1;
    this.api
      .getPopularMovies(page)
      .pipe(
        catchError((err: unknown) => {
          this._spotlightError.set(friendlyHttpErrorMessage(err, 'Витрина'));
          this._spotlightLoading.set(false);
          return of(EMPTY_SEARCH_RESPONSE);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        const list = [...(res.results ?? [])];
        shuffleInPlace(list);
        const withPoster = list.filter((m) => m.poster_path);
        const pool = withPoster.length >= 6 ? withPoster : list;
        this._spotlight.set(pool.slice(0, 6));
        this._spotlightLoading.set(false);
      });
  }
}

const EMPTY_SEARCH_RESPONSE: MovieSearchResponse = {
  page: 1,
  results: [],
  total_pages: 1,
  total_results: 0
};

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = items[i]!;
    const b = items[j]!;
    items[i] = b;
    items[j] = a;
  }
}

