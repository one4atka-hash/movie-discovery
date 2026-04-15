import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '@features/auth/auth.service';
import type { Movie } from '@features/movies/data-access/models/movie.model';
import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import {
  MovieReactionsService,
  type MovieReaction,
} from '@features/movies/data-access/services/movie-reactions.service';
import { ReleaseSubscriptionsService } from '@features/notifications/release-subscriptions.service';
import { WatchStateService } from '@features/watchlist/watch-state.service';
import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { canFollowRelease } from './release-follow.util';

const DEFAULT_RELEASE_CHANNELS = {
  inApp: true,
  webPush: false,
  email: false,
  calendar: false,
} as const;

@Component({
  selector: 'app-movie-actions-sheet',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomSheetComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-bottom-sheet
      [open]="open()"
      [title]="movie()?.title ?? ''"
      ariaLabel="Movie actions"
      (closed)="closed.emit()"
    >
      @if (movie(); as m) {
        <p class="muted">{{ i18n.t('movieActions.subtitle') }}</p>
        <div class="row">
          <app-button variant="secondary" [routerLink]="['/movie', m.id]" (click)="closed.emit()">
            {{ i18n.t('movieActions.openDetails') }}
          </app-button>
        </div>
        <div class="row">
          <app-button variant="ghost" (click)="cycleWatch(m)">
            {{ i18n.t('movieActions.cycleWatchlist') }} ({{ watchLabel(m.id) }})
          </app-button>
        </div>
        <div class="row">
          <app-button variant="ghost" (click)="toggleFav(m)">
            {{
              fav.has(m.id)
                ? i18n.t('movieActions.removeFavorite')
                : i18n.t('movieActions.addFavorite')
            }}
          </app-button>
        </div>
        <div class="row row--tight">
          <app-button
            [variant]="currentReaction() === 'like' ? 'secondary' : 'ghost'"
            (click)="setReaction(m, 'like')"
          >
            {{ i18n.t('movieActions.like') }}
          </app-button>
          <app-button
            [variant]="currentReaction() === 'dislike' ? 'secondary' : 'ghost'"
            (click)="setReaction(m, 'dislike')"
          >
            {{ i18n.t('movieActions.dislike') }}
          </app-button>
        </div>
        @if (isAuthed()) {
          @if (releaseSub(); as sub) {
            <div class="row">
              <app-button variant="ghost" (click)="removeReleaseSub(sub.id)">
                {{ i18n.t('movieActions.removeReleaseAlert') }}
              </app-button>
            </div>
          } @else if (canFollow()) {
            <div class="row">
              <app-button variant="ghost" (click)="addReleaseSub(m)">
                {{ i18n.t('movieActions.followRelease') }}
              </app-button>
            </div>
          }
        } @else if (canFollow()) {
          <p class="muted">{{ i18n.t('movieActions.releaseLoginHint') }}</p>
          <div class="row">
            <app-button variant="secondary" routerLink="/account" (click)="closed.emit()">
              {{ i18n.t('account.login') }}
            </app-button>
          </div>
        }
        <div class="row">
          <app-button
            variant="primary"
            [routerLink]="['/diary']"
            [queryParams]="{ logTitle: m.title, logTmdbId: m.id }"
            (click)="closed.emit()"
          >
            {{ i18n.t('movieActions.logDiary') }}
          </app-button>
        </div>
        <div class="row">
          <app-button
            variant="secondary"
            [routerLink]="['/collections']"
            [queryParams]="{ addTitle: m.title, addTmdbId: m.id }"
            (click)="closed.emit()"
          >
            {{ i18n.t('movieActions.addToList') }}
          </app-button>
        </div>
      }
    </app-bottom-sheet>
  `,
  styles: [
    `
      .muted {
        margin: 0 0 0.65rem;
        color: var(--text-muted);
        font-size: 0.9rem;
        line-height: 1.45;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .row--tight {
        gap: 0.35rem;
      }
    `,
  ],
})
export class MovieActionsSheetComponent {
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  readonly watch = inject(WatchStateService);
  readonly fav = inject(FavoritesService);
  private readonly reactions = inject(MovieReactionsService);
  private readonly subs = inject(ReleaseSubscriptionsService);
  private readonly auth = inject(AuthService);

  readonly open = input(false);
  readonly movie = input<Movie | null>(null);
  readonly closed = output<void>();

  readonly isAuthed = computed(() => this.auth.isAuthenticated());

  readonly currentReaction = computed((): MovieReaction => {
    const m = this.movie();
    if (!m) return null;
    const map = this.reactions.all();
    const v = map[String(m.id)];
    return v === 'like' || v === 'dislike' ? v : null;
  });

  readonly releaseSub = computed(() => {
    const m = this.movie();
    if (!m || !this.auth.user()) return null;
    const uid = this.auth.user()!.id;
    return (
      this.subs
        .mySubscriptions()
        .find((s) => s.userId === uid && s.tmdbId === m.id && s.mediaType === 'movie') ?? null
    );
  });

  readonly canFollow = computed(() => {
    const m = this.movie();
    return m ? canFollowRelease(m) : false;
  });

  watchLabel(tmdbId: number): string {
    const s = this.watch.getStatus(tmdbId);
    if (!s) return '—';
    if (s === 'want') return this.i18n.t('movieActions.stWant');
    if (s === 'watching') return this.i18n.t('movieActions.stWatching');
    if (s === 'watched') return this.i18n.t('movieActions.stWatched');
    if (s === 'dropped') return this.i18n.t('movieActions.stDropped');
    return this.i18n.t('movieActions.stHidden');
  }

  cycleWatch(m: Movie): void {
    const next = this.watch.cycle(m);
    this.toast.show('info', this.i18n.t('movieActions.watchlistTitle'), next);
  }

  toggleFav(m: Movie): void {
    this.fav.toggle(m);
    const added = this.fav.has(m.id);
    this.toast.show(
      'success',
      this.i18n.t('movieActions.favoritesTitle'),
      added ? this.i18n.t('movieActions.favAdded') : this.i18n.t('movieActions.favRemoved'),
    );
  }

  setReaction(m: Movie, kind: 'like' | 'dislike'): void {
    this.reactions.toggle(m.id, kind);
    const after = this.reactions.all()[String(m.id)];
    const body =
      after === kind
        ? this.i18n.t('movieActions.reactionSet')
        : this.i18n.t('movieActions.reactionCleared');
    this.toast.show('info', this.i18n.t('movieActions.reactionsTitle'), body);
  }

  addReleaseSub(m: Movie): void {
    const rd = (m.release_date ?? '').trim();
    if (!rd) {
      this.toast.show(
        'warning',
        this.i18n.t('movieActions.releaseTitle'),
        this.i18n.t('movieActions.releaseNoDate'),
      );
      return;
    }
    try {
      this.subs.upsert({
        tmdbId: m.id,
        mediaType: 'movie',
        title: m.title,
        releaseDate: rd,
        posterPath: m.poster_path ?? null,
        channels: { ...DEFAULT_RELEASE_CHANNELS },
      });
      this.toast.show(
        'success',
        this.i18n.t('movieActions.releaseTitle'),
        this.i18n.t('movieActions.releaseSaved'),
      );
    } catch (e) {
      this.toast.show(
        'error',
        this.i18n.t('movieActions.releaseTitle'),
        e instanceof Error ? e.message : '—',
      );
    }
  }

  removeReleaseSub(id: string): void {
    try {
      this.subs.remove(id);
      this.toast.show(
        'info',
        this.i18n.t('movieActions.releaseTitle'),
        this.i18n.t('movieActions.releaseRemoved'),
      );
    } catch (e) {
      this.toast.show(
        'error',
        this.i18n.t('movieActions.releaseTitle'),
        e instanceof Error ? e.message : '—',
      );
    }
  }
}
