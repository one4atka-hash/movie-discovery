import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Movie } from '../../data-access/models/movie.model';
import { FavoritesService } from '../../data-access/services/favorites.service';

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
          [alt]="movie().title"
          loading="lazy"
          decoding="async"
        />
        <button
          class="card__fav"
          type="button"
          [attr.aria-pressed]="isFavorite()"
          (click)="onToggleFavorite($event)"
          title="В избранное"
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
        border-radius: 16px;
        overflow: hidden;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }

      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.26);
      }

      .card__poster {
        aspect-ratio: 2 / 3;
        background: rgba(255, 255, 255, 0.04);
        position: relative;
      }

      .card__poster--empty {
        background: linear-gradient(135deg, rgba(255, 107, 107, 0.18), rgba(255, 195, 113, 0.12));
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
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.45);
        color: #ffc371;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        display: grid;
        place-items: center;
        backdrop-filter: blur(6px);
      }

      .card__fav:hover {
        background: rgba(0, 0, 0, 0.55);
      }

      .card__body {
        padding: 0.75rem 0.85rem 0.9rem;
      }

      .card__title {
        font-weight: 650;
        line-height: 1.2;
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
        color: #ffc371;
        font-variant-numeric: tabular-nums;
      }
    `
  ]
})
export class MovieCardComponent {
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
    return `https://image.tmdb.org/t/p/w342${path}`;
  }
}

