import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConfigService } from '@core/config.service';
import { MovieService } from '@features/movies/data-access/services/movie.service';
import { Movie } from '@features/movies/data-access/models/movie.model';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="home">
      <header class="hero">
        <p class="hero__kicker">Movie Discovery</p>
        <h1 class="hero__title">{{ i18n.t('home.title') }}</h1>
        <p class="hero__subtitle">{{ i18n.t('home.subtitle') }}</p>

        <div class="hero__actions">
          <a class="btn btn--primary" routerLink="/search">{{ i18n.t('home.cta.search') }}</a>
          <a class="btn" routerLink="/favorites">{{ i18n.t('nav.favorites') }}</a>
        </div>

        <p class="hero__note" *ngIf="!hasTmdbApiKey()">
          {{ i18n.t('home.apiKeyNote') }}
        </p>
      </header>

      <section class="showcase">
        <div class="showcase__head">
          <h2 class="sectionTitle">{{ i18n.t('home.showcaseTitle') }}</h2>
          <a class="link" routerLink="/search">{{ i18n.t('home.showcaseLink') }}</a>
        </div>

        <div class="tiles" *ngIf="movies().length; else tilesSkeleton">
          <a class="tile" *ngFor="let m of movies(); trackBy: trackById" [routerLink]="['/movie', m.id]">
            <div class="tile__poster" [class.tile__poster--empty]="!m.poster_path">
              <img
                *ngIf="m.poster_path as p"
                class="tile__img"
                [src]="posterUrl(p)"
                [attr.srcset]="posterSrcSet(p)"
                sizes="(max-width: 520px) 45vw, (max-width: 980px) 22vw, 180px"
                [alt]="m.title"
                referrerpolicy="no-referrer"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div class="tile__meta">
              <strong class="tile__name">{{ m.title }}</strong>
              <span class="tile__sub">{{ i18n.t('home.openDetails') }}</span>
            </div>
          </a>
        </div>

        <ng-template #tilesSkeleton>
          <div class="tiles">
            <div class="tile tile--skel" *ngFor="let _ of skelSlots; trackBy: trackByIndex"></div>
          </div>
        </ng-template>
      </section>

    </section>
  `,
  styles: [
    `
      .home {
        padding: 1rem 0 2rem;
        display: grid;
        gap: 1.4rem;
      }

      .hero {
        border-radius: 18px;
        border: 1px solid var(--border-subtle);
        background:
          radial-gradient(1000px 420px at 15% 0%, rgba(255, 107, 107, 0.18), transparent 55%),
          radial-gradient(760px 360px at 90% 30%, rgba(255, 195, 113, 0.14), transparent 55%),
          rgba(255, 255, 255, 0.03);
        padding: 1.2rem 1.15rem;
      }
      .hero__kicker {
        margin: 0 0 0.4rem;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .hero__title {
        margin: 0 0 0.55rem;
        font-size: 1.5rem;
        line-height: 1.18;
      }
      .hero__subtitle {
        margin: 0 0 1rem;
        color: var(--text-muted);
        max-width: 60ch;
        line-height: 1.5;
      }
      .hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .hero__note {
        margin: 0.85rem 0 0;
        font-size: 0.9rem;
        color: var(--text-muted);
      }
      code {
        font-size: 0.88em;
        padding: 0.1em 0.35em;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.25);
      }

      .sectionTitle {
        margin: 0 0 0.75rem;
        font-size: 1.15rem;
      }

      .showcase__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.8rem;
        flex-wrap: wrap;
      }
      .link {
        color: #ffc371;
        text-decoration: none;
      }
      .link:hover {
        text-decoration: underline;
      }

      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.85rem;
      }
      .tile {
        text-decoration: none;
        color: inherit;
        border-radius: 16px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.03);
        overflow: hidden;
        transition: transform 0.2s ease, filter 0.2s ease;
      }
      .tile:hover {
        transform: translateY(-3px);
        filter: brightness(1.06);
      }
      .tile:focus-visible {
        outline: 2px solid rgba(255, 195, 113, 0.55);
        outline-offset: 3px;
      }
      .tile__poster {
        aspect-ratio: 2 / 3;
        background: rgba(255, 255, 255, 0.04);
      }
      .tile__poster--empty {
        background: linear-gradient(145deg, rgba(255, 107, 107, 0.2), rgba(255, 195, 113, 0.12));
      }
      .tile__img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      .tile__meta {
        padding: 0.75rem 0.75rem 0.8rem;
        display: grid;
        gap: 0.2rem;
      }
      .tile__name {
        display: block;
        font-size: 0.95rem;
        line-height: 1.25;
      }
      .tile__sub {
        font-size: 0.85rem;
        color: var(--text-muted);
      }

      .tile--skel {
        min-height: 280px;
        background: linear-gradient(
          100deg,
          rgba(255, 255, 255, 0.06) 20%,
          rgba(255, 255, 255, 0.16) 35%,
          rgba(255, 255, 255, 0.06) 50%
        );
        background-size: 200% 100%;
        animation: shimmer 1.25s linear infinite;
      }

      .btn {
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        padding: 0.55rem 0.9rem;
        color: var(--text);
        background: rgba(255, 255, 255, 0.05);
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
      }
      .btn:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.14);
      }
      .btn--primary {
        border-color: rgba(255, 195, 113, 0.45);
        background: rgba(255, 195, 113, 0.14);
      }

      @keyframes shimmer {
        to {
          background-position-x: -200%;
        }
      }
    `
  ]
})
export class HomePageComponent {
  private readonly api = inject(MovieService);
  private readonly config = inject(ConfigService);
  readonly i18n = inject(I18nService);

  readonly skelSlots = [0, 1, 2, 3, 4, 5] as const;

  private readonly _movies = signal<Movie[]>([]);
  readonly movies = computed(() => this._movies());

  constructor() {
    this.api.getPopularMovies(1).subscribe({
      next: (res) => this._movies.set(res.results?.slice(0, 6) ?? []),
      error: () => this._movies.set([])
    });
  }

  hasTmdbApiKey(): boolean {
    return Boolean(this.config.api.apiKey);
  }

  trackById(_: number, m: Movie): number {
    return m.id;
  }

  trackByIndex(i: number): number {
    return i;
  }

  posterUrl(path: string): string {
    return `/imgtmdb/w185${path}`;
  }

  posterSrcSet(path: string): string {
    return [
      `/imgtmdb/w92${path} 92w`,
      `/imgtmdb/w185${path} 185w`,
      `/imgtmdb/w342${path} 342w`
    ].join(', ');
  }
}

