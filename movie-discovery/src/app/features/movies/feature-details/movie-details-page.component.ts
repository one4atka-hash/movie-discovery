import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, of, switchMap } from 'rxjs';

import { Movie, MovieVideo } from '../data-access/models/movie.model';
import { TmdbWatchProviderCountry } from '../data-access/models/watch-providers.model';
import { TMDB_GENRE_LABELS } from '../data-access/tmdb-genres';
import { movieResolver } from './movie.resolver';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FavoritesService } from '../data-access/services/favorites.service';
import { MovieService } from '../data-access/services/movie.service';
import { I18nService } from '@shared/i18n/i18n.service';
import { AuthService } from '@features/auth/auth.service';

@Component({
  selector: 'app-movie-details-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">{{ i18n.t('details.back') }}</a>

      <ng-container *ngIf="movie() as m; else errorTpl">
        <div class="hero">
          <div class="poster" [class.poster--empty]="!m.poster_path">
            <img
              *ngIf="m.poster_path as p"
              class="poster__img"
              [src]="posterUrl(p)"
              [attr.srcset]="posterSrcSet(p)"
              sizes="(max-width: 760px) 70vw, 220px"
              [alt]="m.title"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div class="meta">
            <h1 class="title">{{ m.title }}</h1>
            <div class="sub">
              <span class="muted">
                {{ releaseYear(m) }} <span class="dot" aria-hidden="true">•</span> {{ releaseDateLabel(m) }}
              </span>
              <span class="rating">
                ★ {{ m.vote_average | number: '1.1-1' }}
                <span class="muted" *ngIf="m.vote_count">({{ m.vote_count | number }})</span>
              </span>
            </div>
            <div class="genres" *ngIf="genreLabels(m).length">
              <span class="genre" *ngFor="let label of genreLabels(m)">{{ label }}</span>
            </div>

            <section class="facts" aria-label="Метаданные">
              <div class="facts__grid">
                <div class="fact">
                  <span class="fact__k">Статус</span>
                  <span class="fact__v">{{ m.status || '—' }}</span>
                </div>
                <div class="fact">
                  <span class="fact__k">Длительность</span>
                  <span class="fact__v">{{ runtimeLabel(m) }}</span>
                </div>
                <div class="fact">
                  <span class="fact__k">Язык</span>
                  <span class="fact__v">{{ (m.original_language || '—') | uppercase }}</span>
                </div>
                <div class="fact" *ngIf="m.original_title && m.original_title !== m.title">
                  <span class="fact__k">Оригинальное название</span>
                  <span class="fact__v">{{ m.original_title }}</span>
                </div>
                <div class="fact" *ngIf="countriesLabel(m) as c">
                  <span class="fact__k">Страны</span>
                  <span class="fact__v">{{ c }}</span>
                </div>
              </div>

              <div class="facts__links" *ngIf="m.homepage || m.imdb_id">
                <a
                  *ngIf="m.homepage"
                  class="facts__link"
                  [href]="m.homepage"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Официальный сайт
                </a>
                <a
                  *ngIf="m.imdb_id"
                  class="facts__link"
                  [href]="'https://www.imdb.com/title/' + m.imdb_id"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  IMDb
                </a>
              </div>
            </section>

            <p class="tagline" *ngIf="m.tagline">{{ m.tagline }}</p>
            <p class="overview">{{ m.overview || 'Описание отсутствует.' }}</p>

            <div class="actions">
              <button class="btn btn--fav" type="button" (click)="toggleFavorite(m)">
                {{ favorites.has(m.id) ? i18n.t('details.inFavorites') : i18n.t('details.addToFavorites') }}
              </button>
              @if (canFollowRelease(m)) {
                @if (isAuthed()) {
                  <a class="btn btn--primary" [routerLink]="['/notifications']" [queryParams]="{ tmdbId: m.id }">
                    {{ i18n.t('details.followRelease') }}
                  </a>
                } @else {
                  <a
                    class="btn btn--primary"
                    [routerLink]="['/account']"
                    [queryParams]="{ returnUrl: '/notifications', tmdbId: m.id }"
                  >
                    Войти, чтобы подписаться
                  </a>
                }
              }
            </div>
          </div>
        </div>

        @if (isReleased(m.release_date) && (watchLink() || hasAnyProviders()); as _) {
          <section class="watch">
            <div class="watch__head">
              <strong>Где смотреть (официально)</strong>
              <span class="muted">Провайдеры по региону</span>
            </div>

            @if (watchLink(); as link) {
              <a class="btn btn--primary" [href]="link" target="_blank" rel="noreferrer noopener">Открыть официальную страницу</a>
            }

            @if (activeProviders(); as p) {
              <div class="providers" *ngIf="p.flatrate?.length || p.rent?.length || p.buy?.length">
                <div class="providers__group" *ngIf="p.flatrate?.length">
                  <div class="providers__title">Подписка</div>
                  <div class="providers__list">
                    <span class="prov" *ngFor="let it of p.flatrate">
                      <img *ngIf="it.logo_path" class="prov__logo" [src]="providerLogoUrl(it.logo_path)" [alt]="it.provider_name" />
                      <span class="prov__name">{{ it.provider_name }}</span>
                    </span>
                  </div>
                </div>

                <div class="providers__group" *ngIf="p.rent?.length">
                  <div class="providers__title">Аренда</div>
                  <div class="providers__list">
                    <span class="prov" *ngFor="let it of p.rent">
                      <img *ngIf="it.logo_path" class="prov__logo" [src]="providerLogoUrl(it.logo_path)" [alt]="it.provider_name" />
                      <span class="prov__name">{{ it.provider_name }}</span>
                    </span>
                  </div>
                </div>

                <div class="providers__group" *ngIf="p.buy?.length">
                  <div class="providers__title">Покупка</div>
                  <div class="providers__list">
                    <span class="prov" *ngFor="let it of p.buy">
                      <img *ngIf="it.logo_path" class="prov__logo" [src]="providerLogoUrl(it.logo_path)" [alt]="it.provider_name" />
                      <span class="prov__name">{{ it.provider_name }}</span>
                    </span>
                  </div>
                </div>
              </div>
            }

            <p class="muted watch__note">Доступность зависит от страны и может меняться.</p>
          </section>
        }

        @if (trailer(); as t) {
          <div class="player">
            <div class="player__head">
              <strong>Трейлер</strong>
              <span class="muted">{{ t.name || '—' }}</span>
            </div>

            <div class="player__frame">
              <iframe
                *ngIf="embedUrl(t) as url; else noTrailerTpl"
                [src]="url"
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="no-referrer"
                allowfullscreen
              ></iframe>

              <ng-template #noTrailerTpl>
                <div class="player__empty" role="status">
                  <p class="player__empty-title">Трейлер недоступен для встраивания.</p>
                  <a
                    *ngIf="externalTrailerUrl(t) as href"
                    class="btn btn--primary"
                    [href]="href"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Открыть источник
                  </a>
                </div>
              </ng-template>
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
      .dot {
        opacity: 0.55;
        padding: 0 0.35rem;
      }
      .muted {
        color: var(--text-muted);
      }
      .rating {
        color: #ffc371;
      }
      .tagline {
        margin: 0.9rem 0 0.5rem;
        opacity: 0.85;
        font-style: italic;
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

      .actions {
        margin-top: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .btn {
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
        padding: 0.6rem 1rem;
        cursor: pointer;
        font: inherit;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
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
      .btn--fav {
        background: rgba(0, 0, 0, 0.35);
        color: #ffc371;
      }
      .btn--fav:hover {
        background: rgba(0, 0, 0, 0.45);
      }
      .btn--disabled {
        opacity: 0.55;
        pointer-events: none;
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
      .player__empty {
        height: 100%;
        display: grid;
        place-items: center;
        gap: 0.75rem;
        padding: 1rem;
        text-align: center;
        color: var(--text-muted);
      }
      .player__empty-title {
        margin: 0;
      }

      .watch {
        margin-top: 1.25rem;
        border: 1px solid var(--border-subtle);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.03);
        padding: 0.9rem 1rem;
        display: grid;
        gap: 0.6rem;
      }
      .watch__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .watch__note {
        margin: 0;
        font-size: 0.9rem;
      }

      .providers {
        display: grid;
        gap: 0.85rem;
        margin-top: 0.4rem;
      }
      .providers__title {
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-bottom: 0.35rem;
      }
      .providers__list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .prov {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.35rem 0.6rem;
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.18);
      }
      .prov__logo {
        width: 20px;
        height: 20px;
        border-radius: 5px;
        object-fit: cover;
        display: block;
      }
      .prov__name {
        font-size: 0.9rem;
      }

      .facts {
        margin: 0.75rem 0 0.25rem;
        border: 1px solid var(--border-subtle);
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.18);
        padding: 0.75rem 0.9rem;
      }
      .facts__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.65rem 0.9rem;
      }
      @media (max-width: 520px) {
        .facts__grid {
          grid-template-columns: 1fr;
        }
      }
      .fact {
        display: grid;
        gap: 0.15rem;
      }
      .fact__k {
        font-size: 0.78rem;
        color: var(--text-muted);
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .fact__v {
        font-size: 0.95rem;
      }
      .facts__links {
        margin-top: 0.7rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .facts__link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        padding: 0.45rem 0.8rem;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text);
        text-decoration: none;
      }
      .facts__link:hover {
        border-color: rgba(255, 195, 113, 0.35);
        background: rgba(255, 195, 113, 0.08);
      }
    `
  ]
})
export class MovieDetailsPageComponent {
  static readonly resolver = movieResolver;

  private readonly route = inject(ActivatedRoute);
  readonly favorites = inject(FavoritesService);
  private readonly movies = inject(MovieService);
  readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly auth = inject(AuthService);

  readonly isAuthed = computed(() => this.auth.isAuthenticated());

  // IMPORTANT: use route.data so we wait for resolver completion.
  // Reading snapshot.data inside paramMap can produce partial/old values during navigation.
  readonly movie = toSignal<Movie | null>(
    (this.route.data ?? of({})).pipe(map((d) => (d['movie'] as Movie | undefined) ?? null)),
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

  readonly providers = toSignal(
    this.route.paramMap.pipe(
      map((pm) => Number(pm.get('id'))),
      filter((id) => Number.isFinite(id) && id > 0),
      switchMap((id) => this.movies.getMovieWatchProviders(id)),
      map((res) => res.results ?? {})
    ),
    { initialValue: {} as Record<string, TmdbWatchProviderCountry | undefined> }
  );

  readonly watchLink = computed(() => {
    const r = this.providers();
    const lang = this.i18n.lang();
    const country = lang === 'ru' ? 'RU' : 'US';
    return r[country]?.link ?? r['US']?.link ?? r['RU']?.link ?? null;
  });

  readonly activeProviders = computed(() => {
    const r = this.providers();
    const lang = this.i18n.lang();
    const country = lang === 'ru' ? 'RU' : 'US';
    return r[country] ?? r['US'] ?? r['RU'] ?? null;
  });

  readonly hasAnyProviders = computed(() => {
    const p = this.activeProviders();
    return Boolean(p?.flatrate?.length || p?.rent?.length || p?.buy?.length);
  });

  readonly trailer = computed(() => {
    const vids = this.videos();

    const normalized = vids
      .filter((v) => Boolean(v.key))
      .map((v) => ({ ...v, site: (v.site ?? '').trim() }))
      .filter((v) => v.site.length > 0);

    const youtube = normalized.filter((v) => v.site.toLowerCase() === 'youtube');
    const nonYoutube = normalized.filter((v) => v.site.toLowerCase() !== 'youtube');

    const by = (type: string, official?: boolean) =>
      normalized.find(
        (v) =>
          (v.type ?? '').toLowerCase() === type.toLowerCase() &&
          (official === undefined ? true : (v.official ?? false) === official)
      );

    // Prefer non-YouTube sources when possible (YouTube may be blocked).
    const pick = by('trailer', true) ?? by('trailer') ?? by('teaser', true) ?? by('teaser') ?? null;
    if (pick && pick.site.toLowerCase() !== 'youtube') return pick;
    return pick ?? nonYoutube[0] ?? youtube[0] ?? null;
  });

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
    // Use a reasonable default; allow browser to pick larger via srcset.
    return `/imgtmdb/w342${path}`;
  }

  posterSrcSet(path: string): string {
    return [
      `/imgtmdb/w185${path} 185w`,
      `/imgtmdb/w342${path} 342w`,
      `/imgtmdb/w500${path} 500w`
    ].join(', ');
  }

  providerLogoUrl(path: string): string {
    return `/imgtmdb/w45${path}`;
  }

  private youtubeEmbedUrl(key: string): SafeResourceUrl {
    const origin = encodeURIComponent(window.location.origin);
    const url =
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}` +
      `?rel=0&modestbranding=1&playsinline=1&origin=${origin}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private vimeoEmbedUrl(key: string): SafeResourceUrl {
    // Vimeo "key" from TMDB is a numeric id in most cases.
    const url = `https://player.vimeo.com/video/${encodeURIComponent(key)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  embedUrl(v: MovieVideo): SafeResourceUrl | null {
    const site = (v.site ?? '').toLowerCase();
    const key = (v.key ?? '').trim();
    if (!key) return null;
    if (site === 'youtube') return this.youtubeEmbedUrl(key);
    if (site === 'vimeo') return this.vimeoEmbedUrl(key);
    return null;
  }

  externalTrailerUrl(v: MovieVideo): string | null {
    const site = (v.site ?? '').toLowerCase();
    const key = (v.key ?? '').trim();
    if (!key) return null;
    if (site === 'youtube') return `https://www.youtube.com/watch?v=${encodeURIComponent(key)}`;
    if (site === 'vimeo') return `https://vimeo.com/${encodeURIComponent(key)}`;
    return null;
  }

  releaseYear(m: Movie): string {
    const d = (m.release_date ?? '').trim();
    return d.length >= 4 ? d.slice(0, 4) : '—';
  }

  releaseDateLabel(m: Movie): string {
    return (m.release_date ?? '').trim() || '—';
  }

  runtimeLabel(m: Movie): string {
    const rt = m.runtime;
    if (!rt || !Number.isFinite(rt)) return '—';
    const h = Math.floor(rt / 60);
    const min = rt % 60;
    return h > 0 ? `${h}ч ${min}м` : `${min}м`;
  }

  countriesLabel(m: Movie): string | null {
    const list = m.production_countries ?? [];
    if (!list.length) return null;
    return list.map((c) => c.name).filter(Boolean).slice(0, 4).join(', ');
  }

  isReleased(releaseDate: string | null | undefined): boolean {
    if (!releaseDate) return false;
    // releaseDate from TMDB is YYYY-MM-DD.
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const nowStr = `${yyyy}-${mm}-${dd}`;
    return releaseDate <= nowStr;
  }

  canFollowRelease(m: Movie): boolean {
    // Primary signal: release date is in the future.
    if (m.release_date && !this.isReleased(m.release_date)) return true;

    // Fallback: some TMDB entries have missing release_date but a non-released status.
    const s = (m.status ?? '').toLowerCase();
    if (!s) return false;
    if (s === 'released' || s === 'canceled' || s === 'cancelled') return false;

    return (
      s === 'rumored' ||
      s === 'planned' ||
      s === 'in production' ||
      s === 'post production'
    );
  }
}

