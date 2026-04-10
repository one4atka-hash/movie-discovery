import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConfigService } from '@core/config.service';
import { MovieService } from '@features/movies/data-access/services/movie.service';
import { Movie } from '@features/movies/data-access/models/movie.model';
import { I18nService } from '@shared/i18n/i18n.service';
import { tmdbImg, tmdbPosterSrcSet } from '@core/tmdb-images';

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
          <a class="btn" routerLink="/" fragment="home-favorites">{{ i18n.t('nav.favorites') }}</a>
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
          <a
            class="tile"
            *ngFor="let m of movies(); trackBy: trackById"
            [routerLink]="['/movie', m.id]"
          >
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
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background:
          radial-gradient(
            1000px 420px at 15% 0%,
            color-mix(in srgb, var(--accent) 20%, transparent),
            transparent 55%
          ),
          radial-gradient(
            760px 360px at 90% 30%,
            color-mix(in srgb, var(--accent-secondary) 16%, transparent),
            transparent 55%
          ),
          color-mix(in srgb, var(--bg-elevated) 88%, transparent);
        padding: 1.25rem 1.2rem;
        box-shadow: var(--shadow-xs);
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
        font-size: clamp(1.35rem, 2.8vw, 1.65rem);
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.03em;
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
        padding: 0.12em 0.4em;
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-muted) 75%, transparent);
        border: 1px solid var(--border-subtle);
      }

      .sectionTitle {
        margin: 0 0 0.75rem;
        font-size: 1.12rem;
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      .showcase__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.8rem;
        flex-wrap: wrap;
      }
      .link {
        color: var(--link);
        text-decoration: none;
        font-weight: 500;
        transition: color var(--duration-fast) var(--ease-out);
      }
      .link:hover {
        color: var(--link-hover);
        text-decoration: underline;
        text-underline-offset: 0.15em;
      }

      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.85rem;
        justify-items: start;
      }
      .tile {
        width: 100%;
        max-width: 220px;
        text-decoration: none;
        color: inherit;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
        overflow: hidden;
        transition:
          transform var(--duration-normal) var(--ease-out),
          box-shadow var(--duration-normal) var(--ease-out),
          border-color var(--duration-normal) var(--ease-out);
      }
      .tile:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-card);
        border-color: var(--border-strong);
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
        width: 100%;
        max-width: 220px;
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
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        padding: 0.55rem 1rem;
        font-weight: 500;
        font-size: 0.92rem;
        color: var(--text);
        background: color-mix(in srgb, var(--bg-muted) 45%, transparent);
        transition:
          transform var(--duration-fast) var(--ease-out),
          background var(--duration-fast) var(--ease-out),
          border-color var(--duration-fast) var(--ease-out);
      }
      .btn:hover {
        transform: translateY(-1px);
        background: color-mix(in srgb, var(--bg-muted) 75%, transparent);
        border-color: var(--border-strong);
      }
      .btn--primary {
        border-color: color-mix(in srgb, var(--accent-secondary) 48%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent-secondary) 18%, transparent);
      }

      @keyframes shimmer {
        to {
          background-position-x: -200%;
        }
      }
    `,
  ],
})
export class HomePageComponent {
  private readonly api = inject(MovieService);
  private readonly config = inject(ConfigService);
  readonly i18n = inject(I18nService);

  readonly skelSlots = [0, 1, 2, 3, 4, 5] as const;

  private readonly _movies = signal<Movie[]>([]);
  readonly movies = computed(() => this._movies());

  private localeReloadN = 0;

  constructor() {
    this.api.getPopularMovies(1).subscribe({
      next: (res) => this._movies.set(res.results?.slice(0, 6) ?? []),
      error: () => this._movies.set([]),
    });

    effect(() => {
      this.i18n.tmdbLocale();
      if (this.localeReloadN++ === 0) return;
      untracked(() => {
        this.api.getPopularMovies(1).subscribe({
          next: (res) => this._movies.set(res.results?.slice(0, 6) ?? []),
          error: () => this._movies.set([]),
        });
      });
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
    return tmdbImg(185, path);
  }

  posterSrcSet(path: string): string {
    return tmdbPosterSrcSet(path);
  }
}
