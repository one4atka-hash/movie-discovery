import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Movie } from '@features/movies/data-access/models/movie.model';
import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import { WatchStateService } from '@features/watchlist/watch-state.service';
import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';

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
    `,
  ],
})
export class MovieActionsSheetComponent {
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  readonly watch = inject(WatchStateService);
  readonly fav = inject(FavoritesService);

  readonly open = input(false);
  readonly movie = input<Movie | null>(null);
  readonly closed = output<void>();

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
}
