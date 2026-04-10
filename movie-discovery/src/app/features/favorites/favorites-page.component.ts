import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import { MovieCardComponent } from '@features/movies/ui/movie-card/movie-card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MovieCardComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">← {{ i18n.t('nav.home') }}</a>

      <header class="head">
        <h1 class="title">{{ i18n.t('nav.favorites') }}</h1>
      </header>

      <app-empty-state
        *ngIf="!favorites().length"
        [title]="i18n.t('account.section.favorites')"
        [subtitle]="i18n.t('home.favoritesEmptySubtitle')"
      />

      <div class="grid" *ngIf="favorites().length">
        <a
          class="grid__item"
          *ngFor="let m of favorites(); trackBy: trackById"
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
        margin-bottom: 0.9rem;
      }
      .title {
        margin: 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
        justify-items: start;
      }
      .grid__item {
        width: 100%;
        max-width: 220px;
        text-decoration: none;
        color: inherit;
      }
    `,
  ],
})
export class FavoritesPageComponent {
  readonly i18n = inject(I18nService);
  private readonly fav = inject(FavoritesService);

  readonly favorites = computed(() => this.fav.favorites());

  trackById(_: number, m: { id: number }): number {
    return m.id;
  }
}
