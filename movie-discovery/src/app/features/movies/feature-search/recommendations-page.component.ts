import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';

import { friendlyHttpErrorMessage } from '@core/http-error.util';
import type { Movie, MovieSearchResponse } from '@features/movies/data-access/models/movie.model';
import { MovieService } from '@features/movies/data-access/services/movie.service';
import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import { MovieReactionsService } from '@features/movies/data-access/services/movie-reactions.service';
import { ReleaseSubscriptionsService } from '@features/notifications/release-subscriptions.service';
import { I18nService } from '@shared/i18n/i18n.service';
import { MovieCardComponent } from '@features/movies/ui/movie-card/movie-card.component';

const EMPTY_SEARCH: MovieSearchResponse = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

@Component({
  selector: 'app-recommendations-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MovieCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">← {{ i18n.t('nav.home') }}</a>

      <div class="head">
        <h1 class="title">{{ i18n.t('home.section.recommendations') }}</h1>
        <div class="actions">
          <button class="btn" type="button" (click)="reload()" [disabled]="loading()">
            {{ i18n.t('home.recommendationsRefresh') }}
          </button>
        </div>
      </div>

      <p class="muted" *ngIf="!loading() && !favoritesCount()">
        {{ i18n.t('home.recommendationsEmpty') }}
      </p>
      <p class="muted" *ngIf="err()" role="status">{{ err() }}</p>

      <div class="grid" *ngIf="!loading() && items().length">
        <a
          class="grid__item"
          *ngFor="let m of items(); trackBy: trackById"
          [routerLink]="['/movie', m.id]"
        >
          <app-movie-card [movie]="m" />
        </a>
      </div>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
      }
      .back {
        display: inline-block;
        margin-bottom: 1rem;
        text-decoration: none;
        color: var(--text-muted);
      }
      .back:hover {
        color: var(--text);
      }
      .head {
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        align-items: baseline;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }
      .title {
        margin: 0;
        font-size: 1.4rem;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .btn {
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
        padding: 0.55rem 0.9rem;
        cursor: pointer;
        font: inherit;
      }
      .btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
        margin-top: 0.5rem;
        justify-items: start;
      }
      .grid__item {
        width: 100%;
        max-width: 220px;
        text-decoration: none;
        color: inherit;
      }
      .grid__item:hover {
        transform: translateY(-2px);
        transition: transform 0.18s ease;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: var(--text-muted);
        line-height: 1.5;
      }
    `,
  ],
})
export class RecommendationsPageComponent {
  readonly i18n = inject(I18nService);
  private readonly api = inject(MovieService);
  private readonly fav = inject(FavoritesService);
  private readonly reactions = inject(MovieReactionsService);
  private readonly subsSvc = inject(ReleaseSubscriptionsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _loading = signal(false);
  private readonly _err = signal<string | null>(null);
  private readonly _items = signal<Movie[]>([]);

  readonly loading = computed(() => this._loading());
  readonly err = computed(() => this._err());
  readonly items = computed(() => this._items());
  readonly favoritesCount = computed(() => this.fav.favorites().length);

  constructor() {
    effect(() => {
      void this.fav.favorites().length;
      this.i18n.tmdbLocale();
      untracked(() => this.reload());
    });
  }

  reload(): void {
    this._loading.set(true);
    this._err.set(null);

    const favorites = this.fav.favorites();
    const seedIds = favorites
      .map((m) => m.id)
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, 3);
    if (!seedIds.length) {
      this._items.set([]);
      this._loading.set(false);
      return;
    }

    const liked = new Set<number>(
      Object.entries(this.reactions.all())
        .filter(([, v]) => v === 'like')
        .map(([k]) => Number(k))
        .filter((x) => Number.isFinite(x) && x > 0),
    );
    const subbed = new Set<number>(this.subsSvc.mySubscriptions().map((s) => s.tmdbId));
    const banned = new Set(seedIds);

    forkJoin(
      seedIds.map((id) =>
        this.api.getMovieRecommendations(id, 1).pipe(
          catchError((e: unknown) => {
            this._err.set(friendlyHttpErrorMessage(e, 'Рекомендации'));
            return of(EMPTY_SEARCH);
          }),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((responses) => {
        const seen = new Set<number>();
        const out: Movie[] = [];
        for (const res of responses) {
          for (const m of res.results ?? []) {
            if (!m?.id) continue;
            if (banned.has(m.id) || seen.has(m.id) || liked.has(m.id) || subbed.has(m.id)) continue;
            seen.add(m.id);
            out.push(m);
          }
        }
        this._items.set(out.slice(0, 24));
        this._loading.set(false);
      });
  }

  trackById(_: number, m: Movie): number {
    return m.id;
  }
}
