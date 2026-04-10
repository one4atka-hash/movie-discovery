import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Movie } from '../../data-access/models/movie.model';
import { FavoritesService } from '../../data-access/services/favorites.service';
import { tmdbImg, tmdbPosterSrcSet } from '@core/tmdb-images';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <div class="card__poster" [class.card__poster--empty]="!movie().poster_path">
        <img
          *ngIf="movie().poster_path as p"
          class="card__img"
          [src]="posterUrl(p)"
          [attr.srcset]="posterSrcSet(p)"
          sizes="(max-width: 520px) 45vw, (max-width: 980px) 22vw, 160px"
          [alt]="movie().title"
          referrerpolicy="no-referrer"
          loading="lazy"
          decoding="async"
        />
        <button
          class="card__fav"
          type="button"
          [attr.aria-pressed]="isFavorite()"
          (click)="onToggleFavorite($event)"
          [title]="i18n.t('movieCard.fav.title')"
        >
          {{ isFavorite() ? '♥' : '♡' }}
        </button>
      </div>
      <div class="card__body">
        <div class="card__title">{{ movie().title }}</div>
        <div class="card__meta">
          <span class="card__muted">{{ movie().release_date || '—' }}</span>
          <span class="card__rating">{{ movie().vote_average | number: '1.1-1' }}</span>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .card {
        display: grid;
        grid-template-rows: auto 1fr;
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        overflow: hidden;
        transition:
          transform var(--duration-normal) var(--ease-out),
          box-shadow var(--duration-normal) var(--ease-out),
          border-color var(--duration-normal) var(--ease-out);
      }

      .card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-card);
        border-color: var(--border-strong);
      }

      .card__poster {
        aspect-ratio: 2 / 3;
        background: rgba(255, 255, 255, 0.04);
        position: relative;
      }

      .card__poster--empty {
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--accent) 22%, transparent),
          color-mix(in srgb, var(--accent-secondary) 16%, transparent)
        );
      }

      .card__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .card__fav {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 38px;
        height: 38px;
        border-radius: var(--radius-full);
        border: 1px solid color-mix(in srgb, var(--border-strong) 80%, transparent);
        background: color-mix(in srgb, #000 52%, transparent);
        color: var(--accent-secondary);
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        display: grid;
        place-items: center;
        backdrop-filter: blur(6px);
      }

      .card__fav:hover {
        background: color-mix(in srgb, #000 62%, transparent);
        color: var(--link-hover);
      }

      .card__body {
        padding: 0.75rem 0.85rem 0.9rem;
      }

      .card__title {
        font-weight: 600;
        font-size: 0.92rem;
        line-height: 1.25;
        letter-spacing: -0.02em;
        margin-bottom: 0.4rem;
      }

      .card__meta {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: baseline;
      }

      .card__muted {
        color: var(--text-muted);
        font-size: 0.9rem;
      }

      .card__rating {
        color: var(--accent-secondary);
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        font-size: 0.88rem;
      }
    `,
  ],
})
export class MovieCardComponent {
  readonly i18n = inject(I18nService);
  private readonly favorites = inject(FavoritesService);
  readonly movie = input.required<Movie>();

  isFavorite(): boolean {
    return this.favorites.has(this.movie().id);
  }

  onToggleFavorite(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(this.movie());
  }

  posterUrl(path: string): string {
    return tmdbImg(185, path);
  }

  posterSrcSet(path: string): string {
    return tmdbPosterSrcSet(path);
  }
}
