import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, switchMap } from 'rxjs';

import { Movie, MovieVideo } from '../data-access/models/movie.model';
import { TMDB_GENRE_LABELS } from '../data-access/tmdb-genres';
import { movieResolver } from './movie.resolver';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FavoritesService } from '../data-access/services/favorites.service';
import { MovieService } from '../data-access/services/movie.service';

@Component({
  selector: 'app-movie-details-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/search">← Назад к поиску</a>

      <ng-container *ngIf="movie() as m; else errorTpl">
        <div class="hero">
          <div class="poster" [class.poster--empty]="!m.poster_path">
            <img
              *ngIf="m.poster_path as p"
              class="poster__img"
              [src]="posterUrl(p)"
              [alt]="m.title"
            />
          </div>

          <div class="meta">
            <h1 class="title">{{ m.title }}</h1>
            <div class="sub">
              <span class="muted">{{ m.release_date || '—' }}</span>
              <span class="rating">★ {{ m.vote_average | number: '1.1-1' }}</span>
            </div>
            <div class="genres" *ngIf="genreLabels(m).length">
              <span class="genre" *ngFor="let label of genreLabels(m)">{{ label }}</span>
            </div>
            <p class="overview">{{ m.overview || 'Описание отсутствует.' }}</p>

            <button class="fav" type="button" (click)="toggleFavorite(m)">
              {{ favorites.has(m.id) ? '♥ В избранном' : '♡ В избранное' }}
            </button>
          </div>
        </div>

        @if (youtubeTrailerKey(); as k) {
          <div class="player">
            <div class="player__head">
              <strong>Трейлер</strong>
              <span class="muted">{{ trailerTitle() }}</span>
            </div>

            <div class="player__frame">
              <iframe
                [src]="youtubeEmbedUrl(k)"
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        }
      </ng-container>

      <ng-template #errorTpl>
        <app-empty-state title="Не удалось загрузить фильм" subtitle="Проверьте id и API-ключ." />
      </ng-template>
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

      .hero {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 1.25rem;
        align-items: start;
      }

      @media (max-width: 760px) {
        .hero {
          grid-template-columns: 1fr;
        }
      }

      .poster {
        width: 100%;
        aspect-ratio: 2 / 3;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
      }
      .poster--empty {
        background: linear-gradient(135deg, rgba(255, 107, 107, 0.18), rgba(255, 195, 113, 0.12));
      }
      .poster__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .title {
        margin: 0 0 0.4rem;
      }
      .sub {
        display: flex;
        gap: 0.75rem;
        align-items: baseline;
        margin-bottom: 0.75rem;
      }
      .muted {
        color: var(--text-muted);
      }
      .rating {
        color: #ffc371;
      }
      .overview {
        margin: 0;
        line-height: 1.6;
        opacity: 0.9;
      }

      .genres {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.25rem 0 0.75rem;
      }
      .genre {
        padding: 0.25rem 0.6rem;
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text-muted);
        font-size: 0.85rem;
      }

      .fav {
        margin-top: 1rem;
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.35);
        color: #ffc371;
        padding: 0.6rem 1rem;
        cursor: pointer;
        font: inherit;
      }
      .fav:hover {
        background: rgba(0, 0, 0, 0.45);
      }

      .player {
        margin-top: 1.25rem;
        border: 1px solid var(--border-subtle);
        border-radius: 18px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.25);
      }

      .player__head {
        display: flex;
        gap: 0.75rem;
        align-items: baseline;
        justify-content: space-between;
        padding: 0.9rem 1rem;
        border-bottom: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.03);
      }

      .player__frame {
        aspect-ratio: 16 / 9;
        background: rgba(0, 0, 0, 0.35);
      }

      .player__frame iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }
    `
  ]
})
export class MovieDetailsPageComponent {
  static readonly resolver = movieResolver;

  private readonly route = inject(ActivatedRoute);
  readonly favorites = inject(FavoritesService);
  private readonly movies = inject(MovieService);

  readonly movie = toSignal<Movie | null>(
    this.route.paramMap.pipe(map(() => (this.route.snapshot.data['movie'] as Movie | undefined) ?? null)),
    { initialValue: null }
  );

  readonly hasMovie = computed(() => Boolean(this.movie()));

  readonly videos = toSignal(
    this.route.paramMap.pipe(
      map((pm) => Number(pm.get('id'))),
      filter((id) => Number.isFinite(id) && id > 0),
      switchMap((id) => this.movies.getMovieVideos(id)),
      map((res) => res.results ?? [])
    ),
    { initialValue: [] as MovieVideo[] }
  );

  readonly trailer = computed(() => {
    const vids = this.videos();
    const youtube = vids.filter((v) => (v.site ?? '').toLowerCase() === 'youtube');
    const byType = (t: string) => youtube.find((v) => (v.type ?? '').toLowerCase() === t.toLowerCase());

    return (
      byType('trailer') ??
      youtube.find((v) => (v.official ?? false) === true) ??
      youtube[0] ??
      null
    );
  });

  readonly youtubeTrailerKey = computed(() => this.trailer()?.key ?? null);
  readonly trailerTitle = computed(() => this.trailer()?.name ?? '—');

  toggleFavorite(m: Movie): void {
    this.favorites.toggle(m);
  }

  genreLabels(m: Movie): readonly string[] {
    if (m.genres?.length) {
      return m.genres.map((g) => g.name);
    }
    const ids = m.genre_ids;
    if (!ids?.length) return [];
    return ids.map((id) => TMDB_GENRE_LABELS[id] ?? `id:${id}`);
  }

  posterUrl(path: string): string {
    return `https://image.tmdb.org/t/p/w500${path}`;
  }

  youtubeEmbedUrl(key: string): string {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}`;
  }
}

