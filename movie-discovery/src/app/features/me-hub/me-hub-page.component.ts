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
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';

import { friendlyHttpErrorMessage } from '@core/http-error.util';
import { tmdbImg } from '@core/tmdb-images';
import { AuthService } from '@features/auth/auth.service';
import type { DiaryEntry } from '@features/diary/diary.model';
import { DiaryService } from '@features/diary/diary.service';
import { InboxService } from '@features/inbox/inbox.service';
import type { Movie, MovieSearchResponse } from '@features/movies/data-access/models/movie.model';
import { MovieService } from '@features/movies/data-access/services/movie.service';
import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { SkeletonLinesComponent } from '@shared/ui/skeleton-lines/skeleton-lines.component';
import { MovieActionsSheetComponent } from '@shared/ui/movie-actions-sheet/movie-actions-sheet.component';
import { I18nService } from '@shared/i18n/i18n.service';
import type { WatchStateItem } from '@features/watchlist/watch-state.model';
import { WatchStateService } from '@features/watchlist/watch-state.service';

const EMPTY_SEARCH: MovieSearchResponse = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

@Component({
  selector: 'app-me-hub-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    SectionComponent,
    SkeletonLinesComponent,
    MovieActionsSheetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/account">← {{ i18n.t('me.backAccount') }}</a>

      <header class="head">
        <h1 class="title">{{ i18n.t('me.title') }}</h1>
        <p class="sub">{{ i18n.t('me.subtitle') }}</p>
      </header>

      <app-card [title]="i18n.t('me.quickAddTitle')">
        <p class="muted">{{ i18n.t('me.quickAddHint') }}</p>
        <div class="quickRow">
          <input
            class="input"
            type="search"
            [attr.placeholder]="i18n.t('me.quickAddPlaceholder')"
            [(ngModel)]="quickDraft"
            (keydown.enter)="submitQuickSearch($event)"
          />
          <app-button variant="primary" type="button" (click)="submitQuickSearch($event)">
            {{ i18n.t('me.quickAddCta') }}
          </app-button>
        </div>
      </app-card>

      <app-section [title]="i18n.t('me.sectionWatchlist')">
        <div sectionActions>
          <a class="link" routerLink="/watchlist">{{ i18n.t('me.seeAll') }}</a>
        </div>
        <app-empty-state
          *ngIf="!watchPreview().length"
          [title]="i18n.t('me.sectionWatchlist')"
          [subtitle]="i18n.t('me.emptyWatchlist')"
        >
          <app-button variant="primary" routerLink="/">{{ i18n.t('home.cta.search') }}</app-button>
          <app-button variant="secondary" routerLink="/watchlist">{{
            i18n.t('me.seeAll')
          }}</app-button>
        </app-empty-state>
        <ul class="rows" *ngIf="watchPreview().length">
          <li class="row" *ngFor="let it of watchPreview(); trackBy: trackByTmdb">
            <button type="button" class="row__main" (click)="openActions(watchToMovie(it))">
              <div class="thumb" [class.thumb--empty]="!it.movie.poster_path">
                <img
                  *ngIf="it.movie.poster_path as p"
                  [src]="posterUrl(p)"
                  alt=""
                  width="46"
                  height="69"
                />
              </div>
              <div class="row__text">
                <span class="row__title">{{ it.movie.title }}</span>
                <span class="row__meta">{{ statusLabel(it.status) }}</span>
              </div>
            </button>
          </li>
        </ul>
      </app-section>

      <app-section [title]="i18n.t('me.sectionDiary')">
        <div sectionActions>
          <a class="link" routerLink="/diary">{{ i18n.t('me.seeAll') }}</a>
        </div>
        <app-empty-state
          *ngIf="!diaryPreview().length"
          [title]="i18n.t('me.sectionDiary')"
          [subtitle]="i18n.t('me.emptyDiary')"
        >
          <app-button variant="primary" routerLink="/diary">{{ i18n.t('me.seeAll') }}</app-button>
        </app-empty-state>
        <ul class="rows" *ngIf="diaryPreview().length">
          @for (e of diaryPreview(); track e.id) {
            <li class="row">
              @if (entryToMovie(e); as em) {
                <button type="button" class="row__main" (click)="openActions(em)">
                  <div class="thumb thumb--empty"></div>
                  <div class="row__text">
                    <span class="row__title">{{ e.title }}</span>
                    <span class="row__meta">{{ e.watchedAt }}</span>
                  </div>
                </button>
              } @else {
                <a class="row__main row__main--link" routerLink="/diary">
                  <div class="thumb thumb--empty"></div>
                  <div class="row__text">
                    <span class="row__title">{{ e.title }}</span>
                    <span class="row__meta">{{ e.watchedAt }}</span>
                  </div>
                </a>
              }
            </li>
          }
        </ul>
      </app-section>

      <app-section [title]="i18n.t('me.sectionInbox')">
        <div sectionActions>
          <a class="link" routerLink="/inbox">{{ i18n.t('me.seeAll') }}</a>
        </div>
        <p class="muted">
          {{ i18n.t('me.inboxRulesPrefix') }}
          <strong>{{ rulesCount() }}</strong>
        </p>
        <a *ngIf="isAuthed()" class="link" routerLink="/account" fragment="account-subs">{{
          i18n.t('me.releaseSubs')
        }}</a>
      </app-section>

      <app-section [title]="i18n.t('me.sectionRecs')">
        <div sectionActions>
          <a class="link" routerLink="/favorites">{{ i18n.t('me.favoritesLink') }}</a>
        </div>
        <app-skeleton-lines *ngIf="recsLoading()" [count]="6" [label]="i18n.t('me.recsLoading')" />
        <ng-container *ngIf="!recsLoading() && recsErr()">
          <p class="muted recErr" role="alert">{{ recsErr() }}</p>
          <div class="recRetry">
            <app-button variant="secondary" type="button" (click)="retryRecs()">
              {{ i18n.t('common.retry') }}
            </app-button>
          </div>
        </ng-container>
        <app-empty-state
          *ngIf="!recsLoading() && !recsErr() && !recs().length"
          [title]="i18n.t('me.sectionRecs')"
          [subtitle]="i18n.t('me.recsEmpty')"
        >
          <app-button variant="primary" routerLink="/favorites">{{
            i18n.t('me.favoritesLink')
          }}</app-button>
        </app-empty-state>
        <div class="recGrid" *ngIf="!recsLoading() && !recsErr() && recs().length">
          <div class="recCell" *ngFor="let m of recs(); trackBy: trackByMovieId">
            <a class="recLink" [routerLink]="['/movie', m.id]">
              <div class="thumb lg" [class.thumb--empty]="!m.poster_path">
                <img
                  *ngIf="m.poster_path as p"
                  [src]="posterUrl(p)"
                  [alt]="m.title"
                  width="92"
                  height="138"
                />
              </div>
              <span class="recTitle">{{ m.title }}</span>
            </a>
            <app-button variant="ghost" type="button" (click)="openActions(m)">
              {{ i18n.t('me.moreActions') }}
            </app-button>
          </div>
        </div>
      </app-section>

      <app-movie-actions-sheet
        [open]="sheetOpen()"
        [movie]="sheetMovie()"
        (closed)="closeSheet()"
      />
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
        display: grid;
        gap: 1rem;
      }
      .back {
        text-decoration: none;
        color: var(--text-muted);
      }
      .head .title {
        margin: 0 0 0.25rem;
      }
      .sub {
        margin: 0;
        color: var(--text-muted);
        line-height: 1.5;
        max-width: 70ch;
      }
      .muted {
        margin: 0 0 0.65rem;
        color: var(--text-muted);
        font-size: 0.9rem;
        line-height: 1.45;
      }
      .recErr {
        margin: 0 0 0.5rem;
      }
      .recRetry {
        margin: 0 0 0.75rem;
      }
      .quickRow {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .input {
        flex: 1 1 200px;
        min-width: 0;
        padding: 0.55rem 0.75rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
        color: var(--text);
        font: inherit;
      }
      .link {
        color: var(--link);
        text-decoration: none;
        font-weight: 600;
        font-size: 0.88rem;
      }
      .link:hover {
        text-decoration: underline;
      }
      .rows {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .row__main {
        display: flex;
        gap: 0.65rem;
        align-items: center;
        width: 100%;
        text-align: left;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 0.45rem 0.55rem;
        background: color-mix(in srgb, var(--bg-elevated) 80%, transparent);
        color: inherit;
        font: inherit;
        cursor: pointer;
      }
      .row__main--link {
        text-decoration: none;
        cursor: pointer;
      }
      .thumb {
        width: 46px;
        height: 69px;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border-subtle);
      }
      .thumb.lg {
        width: 92px;
        height: 138px;
      }
      .thumb--empty {
        background: linear-gradient(145deg, rgba(255, 107, 107, 0.15), rgba(255, 195, 113, 0.08));
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .row__text {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }
      .row__title {
        font-weight: 600;
        font-size: 0.92rem;
        line-height: 1.25;
      }
      .row__meta {
        font-size: 0.78rem;
        color: var(--text-muted);
      }
      .recGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.75rem;
      }
      .recCell {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        align-items: stretch;
      }
      .recLink {
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .recTitle {
        font-size: 0.82rem;
        line-height: 1.25;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class MeHubPageComponent {
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly moviesApi = inject(MovieService);
  private readonly fav = inject(FavoritesService);
  private readonly watch = inject(WatchStateService);
  private readonly diary = inject(DiaryService);
  private readonly inbox = inject(InboxService);
  private readonly auth = inject(AuthService);

  quickDraft = '';

  readonly sheetOpen = signal(false);
  readonly sheetMovie = signal<Movie | null>(null);

  readonly recsLoading = signal(false);
  readonly recsErr = signal<string | null>(null);
  readonly recs = signal<Movie[]>([]);

  readonly watchPreview = computed(() => this.watch.sorted().slice(0, 5));
  readonly diaryPreview = computed(() => this.diary.sorted().slice(0, 5));
  readonly rulesCount = computed(() => this.inbox.rules().length);
  readonly isAuthed = computed(() => this.auth.isAuthenticated());

  constructor() {
    effect(() => {
      void this.fav.favorites().length;
      this.i18n.tmdbLocale();
      untracked(() => this.loadRecs());
    });
  }

  submitQuickSearch(ev: Event): void {
    ev.preventDefault();
    const q = this.quickDraft.trim();
    if (q.length < 2) return;
    void this.router.navigate(['/'], { queryParams: { q } });
  }

  posterUrl(path: string): string {
    return tmdbImg(92, path);
  }

  openActions(m: Movie): void {
    this.sheetMovie.set(m);
    this.sheetOpen.set(true);
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
    this.sheetMovie.set(null);
  }

  watchToMovie(it: WatchStateItem): Movie {
    return {
      id: it.tmdbId,
      title: it.movie.title,
      overview: '',
      poster_path: it.movie.poster_path,
      backdrop_path: null,
      release_date: it.movie.release_date,
      vote_average: it.movie.vote_average,
    };
  }

  entryToMovie(e: DiaryEntry): Movie | null {
    if (!e.tmdbId || e.tmdbId <= 0) return null;
    return {
      id: e.tmdbId,
      title: e.title,
      overview: '',
      poster_path: null,
      backdrop_path: null,
      release_date: '',
      vote_average: 0,
    };
  }

  statusLabel(s: WatchStateItem['status']): string {
    const map: Record<string, string> = {
      want: this.i18n.t('movieActions.stWant'),
      watching: this.i18n.t('movieActions.stWatching'),
      watched: this.i18n.t('movieActions.stWatched'),
      dropped: this.i18n.t('movieActions.stDropped'),
      hidden: this.i18n.t('movieActions.stHidden'),
    };
    return map[s] ?? s;
  }

  trackByTmdb(_: number, it: WatchStateItem): number {
    return it.tmdbId;
  }

  trackByMovieId(_: number, m: Movie): number {
    return m.id;
  }

  retryRecs(): void {
    this.recsErr.set(null);
    this.loadRecs();
  }

  private loadRecs(): void {
    this.recsLoading.set(true);
    this.recsErr.set(null);
    const favorites = this.fav.favorites();
    if (!favorites.length) {
      this.recs.set([]);
      this.recsLoading.set(false);
      return;
    }
    const seedIds = favorites
      .map((m) => m.id)
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, 3);
    if (!seedIds.length) {
      this.recs.set([]);
      this.recsLoading.set(false);
      return;
    }
    const banned = new Set(seedIds);
    forkJoin(
      seedIds.map((id) =>
        this.moviesApi.getMovieRecommendations(id, 1).pipe(
          catchError((err: unknown) => {
            this.recsErr.set(friendlyHttpErrorMessage(err, this.i18n.t('me.recsErrorCtx')));
            return of(EMPTY_SEARCH);
          }),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((responses) => {
        const out: Movie[] = [];
        const seen = new Set<number>();
        for (const res of responses) {
          for (const m of res.results ?? []) {
            if (!m?.id || banned.has(m.id) || seen.has(m.id)) continue;
            seen.add(m.id);
            out.push(m);
          }
        }
        out.sort((a, b) => a.id - b.id);
        this.recs.set(out.slice(0, 6));
        this.recsLoading.set(false);
      });
  }
}
