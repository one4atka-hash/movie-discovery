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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  concat,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
} from 'rxjs';

import { Movie, MovieVideo } from '../data-access/models/movie.model';
import { TmdbWatchProviderCountry } from '../data-access/models/watch-providers.model';
import { TMDB_GENRE_LABELS } from '../data-access/tmdb-genres';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { LoaderComponent } from '@shared/ui/loader/loader.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import {
  ServerCinemaApiService,
  type MovieReleasesResponse,
  type ServerReleaseReminderItem,
} from '@core/server-cinema-api.service';
import { ServerPushSyncService } from '@core/server-push-sync.service';
import { StorageService } from '@core/storage.service';
import { tmdbImg, tmdbPosterSrcSet } from '@core/tmdb-images';
import { FavoritesService } from '../data-access/services/favorites.service';
import { MovieService } from '../data-access/services/movie.service';
import { I18nService } from '@shared/i18n/i18n.service';
import { AuthService } from '@features/auth/auth.service';
import { StreamingPrefsService } from '@features/streaming/streaming-prefs.service';
import {
  type MergedWatchRow,
  type StreamingContext,
  type WatchKind,
  listRegionsWithData,
  mergeWatchProviderRows,
  pickDefaultRegionCode,
  staticStreamingHubs,
  streamingUrlForProvider,
} from '@core/streaming/streaming-links';
import { buildReleaseIcs } from '@core/release-ics.util';
import {
  ReleaseSubscriptionsService,
  type NotificationChannel,
} from '@features/notifications/release-subscriptions.service';
import { WatchStateService } from '@features/watchlist/watch-state.service';
import type { WatchStatus } from '@features/watchlist/watch-state.model';

@Component({
  selector: 'app-movie-details-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent, LoaderComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">{{ i18n.t('details.back') }}</a>

      <ng-container *ngIf="movie() === undefined">
        <app-loader />
      </ng-container>

      <ng-container *ngIf="movie() !== undefined">
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
                  {{ releaseYear(m) }} <span class="dot" aria-hidden="true">•</span>
                  {{ releaseDateLabel(m) }}
                </span>
                <span class="rating">
                  ★ {{ m.vote_average | number: '1.1-1' }}
                  <span class="muted" *ngIf="m.vote_count">({{ m.vote_count | number }})</span>
                </span>
              </div>
              <div class="genres" *ngIf="genreLabels(m).length">
                <span class="genre" *ngFor="let label of genreLabels(m)">{{ label }}</span>
              </div>
              <p class="muted details-watch" data-testid="details-watch-status">
                Watchlist: {{ detailsWatchlistLabel() }}
              </p>

              <section class="facts" [attr.aria-label]="i18n.t('details.facts.aria')">
                <div class="facts__grid">
                  <div class="fact">
                    <span class="fact__k">{{ i18n.t('details.facts.status') }}</span>
                    <span class="fact__v">{{ m.status || '—' }}</span>
                  </div>
                  <div class="fact">
                    <span class="fact__k">{{ i18n.t('details.facts.runtime') }}</span>
                    <span class="fact__v">{{ runtimeLabel(m) }}</span>
                  </div>
                  <div class="fact">
                    <span class="fact__k">{{ i18n.t('details.facts.lang') }}</span>
                    <span class="fact__v">{{ m.original_language || '—' | uppercase }}</span>
                  </div>
                  <div class="fact" *ngIf="m.original_title && m.original_title !== m.title">
                    <span class="fact__k">{{ i18n.t('details.facts.originalTitle') }}</span>
                    <span class="fact__v">{{ m.original_title }}</span>
                  </div>
                  <div class="fact" *ngIf="countriesLabel(m) as c">
                    <span class="fact__k">{{ i18n.t('details.facts.countries') }}</span>
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
                    {{ i18n.t('details.links.homepage') }}
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
              <p class="overview">{{ m.overview || i18n.t('details.overview.empty') }}</p>

              <div class="actions">
                <button class="btn btn--fav" type="button" (click)="toggleFavorite(m)">
                  {{
                    favorites.has(m.id)
                      ? i18n.t('details.inFavorites')
                      : i18n.t('details.addToFavorites')
                  }}
                </button>
                @if (canFollowRelease(m) && !isAuthed()) {
                  <a
                    class="btn btn--primary"
                    [routerLink]="['/account']"
                    [queryParams]="{ returnUrl: '/movie/' + m.id }"
                  >
                    {{ i18n.t('details.loginToSubscribe') }}
                  </a>
                }
              </div>

              @if (canFollowRelease(m) && isAuthed()) {
                <div class="releasePanel">
                  <h3 class="releasePanel__title">{{ i18n.t('details.releaseAlertsTitle') }}</h3>
                  @if (!releaseDateForSubscribe(m)) {
                    <p class="muted releasePanel__hint">
                      {{ i18n.t('details.releaseNoDateHint') }}
                    </p>
                  } @else {
                    <div class="releasePanel__channels">
                      <label class="chk"
                        ><input
                          type="checkbox"
                          [checked]="releaseChannel('inApp')"
                          (change)="setReleaseChannel('inApp', $event)"
                        />
                        In-app</label
                      >
                      <label class="chk"
                        ><input
                          type="checkbox"
                          [checked]="releaseChannel('webPush')"
                          (change)="setReleaseChannel('webPush', $event)"
                        />
                        Web Push</label
                      >
                      <label class="chk"
                        ><input
                          type="checkbox"
                          [checked]="releaseChannel('email')"
                          (change)="setReleaseChannel('email', $event)"
                        />
                        Email</label
                      >
                      <label class="chk"
                        ><input
                          type="checkbox"
                          [checked]="releaseChannel('calendar')"
                          (change)="setReleaseChannel('calendar', $event)"
                        />
                        Calendar</label
                      >
                    </div>
                    <div class="releasePanel__row">
                      <button
                        class="btn btn--primary"
                        type="button"
                        (click)="saveReleaseSubscription(m)"
                      >
                        {{ i18n.t('notifications.save') }}
                      </button>
                      <button
                        class="btn"
                        type="button"
                        (click)="downloadReleaseIcs(m)"
                        [disabled]="!releaseChannel('calendar')"
                      >
                        {{ i18n.t('notifications.downloadIcs') }}
                      </button>
                      @if (existingReleaseSubscription(); as ex) {
                        <button
                          class="btn"
                          type="button"
                          (click)="removeReleaseSubscription(ex.id)"
                        >
                          {{ i18n.t('notifications.remove') }}
                        </button>
                      }
                    </div>
                    <p class="hint" *ngIf="releaseChannel('email')">
                      {{ i18n.t('notifications.emailHint') }}
                    </p>
                    <p class="releasePanel__err" *ngIf="releaseSubscribeError()">
                      {{ releaseSubscribeError() }}
                    </p>
                  }
                </div>
              }
            </div>
          </div>

          @if (serverJwtPresent()) {
            <section class="timeline" aria-labelledby="timeline-title">
              <div class="timeline__head">
                <h2 class="timeline__title" id="timeline-title">
                  {{ i18n.t('details.timeline.title') }}
                </h2>
                <p class="muted timeline__hint">{{ i18n.t('details.timeline.hint') }}</p>
              </div>
              @if (movieReleases() === undefined) {
                <p class="muted">{{ i18n.t('details.timeline.loading') }}</p>
              } @else if (movieReleases() === null) {
                <p class="muted">
                  {{ movieReleasesErr() || i18n.t('details.timeline.unavailable') }}
                </p>
              } @else if (movieReleases(); as rel) {
                <p class="muted">
                  {{ i18n.t('details.timeline.region') }}: {{ rel.region || effectiveRegion() }} ·
                  cached:
                  {{ rel.cached }}
                </p>
                <ul class="timeline__list">
                  @for (row of rel.results; track row.iso31661) {
                    <li>
                      <strong>{{ row.iso31661 }}</strong> — {{ row.releaseDates.length }}
                      {{ i18n.t('details.timeline.entries') }}
                    </li>
                  }
                </ul>
              }

              <h3 class="timeline__sub">{{ i18n.t('details.timeline.remindersTitle') }}</h3>
              <div class="timeline__form">
                <label class="timeline__lbl">
                  {{ i18n.t('details.timeline.reminderType') }}
                  <select
                    class="timeline__select"
                    [value]="serverReminderType()"
                    (change)="setServerReminderType($event)"
                  >
                    <option value="any">any</option>
                    <option value="theatrical">theatrical</option>
                    <option value="digital">digital</option>
                    <option value="physical">physical</option>
                  </select>
                </label>
                <label class="timeline__lbl">
                  {{ i18n.t('details.timeline.daysBefore') }}
                  <input
                    class="timeline__input"
                    type="number"
                    min="0"
                    max="365"
                    [value]="serverReminderDaysBefore()"
                    (input)="setServerReminderDays($any($event.target).valueAsNumber)"
                  />
                </label>
                <label class="timeline__lbl chk">
                  <input
                    type="checkbox"
                    [checked]="serverReminderInApp()"
                    (change)="serverReminderInApp.set($any($event.target).checked)"
                  />
                  {{ i18n.t('details.timeline.inApp') }}
                </label>
                <button class="btn btn--primary" type="button" (click)="saveServerReminder(m)">
                  {{ i18n.t('details.timeline.save') }}
                </button>
              </div>

              @if (serverRemindersForMovie().length === 0) {
                <p class="muted">{{ i18n.t('details.timeline.none') }}</p>
              } @else {
                <ul class="timeline__reminders">
                  @for (r of serverRemindersForMovie(); track r.id) {
                    <li class="timeline__reminder-row">
                      <span>{{ r.reminderType }} · {{ r.window.daysBefore }}d</span>
                      <button class="btn" type="button" (click)="deleteServerReminder(r.id)">
                        Remove
                      </button>
                    </li>
                  }
                </ul>
              }
            </section>
          }

          <section class="hubs" aria-labelledby="streaming-hubs-title">
            <div class="hubs__head">
              <h2 class="hubs__title" id="streaming-hubs-title">
                {{ i18n.t('details.hubs.title') }}
              </h2>
              <p class="muted hubs__note">{{ i18n.t('details.hubs.note') }}</p>
            </div>
            <div class="hub-grid">
              <a
                class="hub-card"
                *ngFor="let h of streamingHubs()"
                [href]="h.url"
                target="_blank"
                rel="noreferrer noopener"
              >
                {{ i18n.t(h.translationKey) }}
              </a>
            </div>
          </section>

          @if (tmdbWatchBlockVisible()) {
            <section class="watch" aria-labelledby="watch-tmdb-title">
              <div class="watch__head">
                <div class="watch__intro">
                  <h2 class="watch__title" id="watch-tmdb-title">
                    {{ i18n.t('details.watch.tmdbTitle') }}
                  </h2>
                  <span class="muted">{{ i18n.t('details.watch.tmdbSubtitle') }}</span>
                </div>
                <span class="watch__region muted">
                  {{ i18n.t('details.watch.region') }}: <strong>{{ effectiveRegion() }}</strong>
                </span>
              </div>

              <div
                class="region-chips"
                *ngIf="availableRegions().length > 1"
                role="group"
                [attr.aria-label]="i18n.t('details.watch.regionPickAria')"
              >
                <button
                  type="button"
                  class="region-chip"
                  *ngFor="let cc of availableRegions()"
                  [class.region-chip--active]="cc === effectiveRegion()"
                  (click)="setWatchRegion(cc)"
                >
                  {{ cc }}
                </button>
              </div>

              @if (watchLinkActive(); as link) {
                <a
                  class="btn btn--primary watch__jw"
                  [href]="link"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {{ i18n.t('details.watch.justwatchBtn') }}
                </a>
              }

              <div class="providers providers--merged" *ngIf="mergedProviders().length">
                <div class="providers__title">{{ i18n.t('details.watch.providersTitle') }}</div>
                <div class="providers__list providers__list--cards">
                  <a
                    class="prov prov--link"
                    [class.prov--mine]="isMyProvider(row.provider.provider_name)"
                    *ngFor="let row of mergedProviders()"
                    [href]="providerRowUrl(row)"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <img
                      *ngIf="row.provider.logo_path"
                      class="prov__logo"
                      [src]="providerLogoUrl(row.provider.logo_path)"
                      [alt]="row.provider.provider_name"
                    />
                    <span class="prov__name">{{ row.provider.provider_name }}</span>
                    <span class="prov__kinds">
                      <app-badge size="sm" variant="muted" *ngFor="let k of row.kinds">
                        {{ kindLabel(k) }}
                      </app-badge>
                    </span>
                    <app-badge
                      *ngIf="isMyProvider(row.provider.provider_name)"
                      size="sm"
                      variant="accent"
                    >
                      My
                    </app-badge>
                  </a>
                </div>
              </div>

              <p class="muted watch__note">{{ i18n.t('details.watch.disclaimer') }}</p>
            </section>
          }

          @if (trailer(); as t) {
            <div class="player">
              <div class="player__head">
                <strong>{{ i18n.t('details.trailer.title') }}</strong>
                <span class="muted">{{ t.name || '—' }}</span>
              </div>

              <div class="player__frame">
                <iframe
                  *ngIf="embedUrl(t) as url; else noTrailerTpl"
                  [src]="url"
                  [title]="i18n.t('details.trailer.title')"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="no-referrer"
                  allowfullscreen
                ></iframe>

                <ng-template #noTrailerTpl>
                  <div class="player__empty" role="status">
                    <p class="player__empty-title">
                      {{ i18n.t('details.trailer.embedUnavailable') }}
                    </p>
                    <a
                      *ngIf="externalTrailerUrl(t) as href"
                      class="btn btn--primary"
                      [href]="href"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {{ i18n.t('details.trailer.openSource') }}
                    </a>
                  </div>
                </ng-template>
              </div>
            </div>
          }
        </ng-container>
      </ng-container>

      <ng-template #errorTpl>
        <app-empty-state
          [title]="i18n.t('details.error.title')"
          [subtitle]="i18n.t('details.error.subtitle')"
        />
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
        color: var(--accent-secondary);
        font-weight: 600;
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
      .details-watch {
        margin: 0 0 0.65rem;
        font-size: 0.92rem;
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
        transition:
          transform 0.15s ease,
          background 0.15s ease,
          border-color 0.15s ease;
      }
      .btn:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.14);
      }
      .btn--primary {
        border-color: color-mix(in srgb, var(--accent-secondary) 50%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent-secondary) 16%, transparent);
      }
      .btn--fav {
        background: color-mix(in srgb, #000 38%, transparent);
        color: var(--accent-secondary);
      }
      .btn--fav:hover {
        background: rgba(0, 0, 0, 0.45);
      }
      .btn--disabled {
        opacity: 0.55;
        pointer-events: none;
      }

      .releasePanel {
        margin-top: 1rem;
        padding: 1rem 1.05rem;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 82%, transparent);
        display: grid;
        gap: 0.75rem;
      }
      .releasePanel__title {
        margin: 0;
        font-size: 1.02rem;
        font-weight: 600;
      }
      .releasePanel__hint {
        margin: 0;
        line-height: 1.5;
      }
      .releasePanel__channels {
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem;
      }
      .chk {
        display: inline-flex;
        gap: 0.45rem;
        align-items: center;
        color: var(--text-muted);
        font-size: 0.92rem;
      }
      .releasePanel__row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        align-items: center;
      }
      .hint {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.9rem;
        line-height: 1.5;
      }
      .releasePanel__err {
        margin: 0;
        color: var(--accent);
        font-size: 0.9rem;
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

      .hubs {
        margin-top: 1.25rem;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        background: color-mix(in srgb, var(--bg-elevated) 70%, transparent);
        padding: 1rem 1.1rem 1.15rem;
        display: grid;
        gap: 0.75rem;
      }
      .hubs__head {
        display: grid;
        gap: 0.35rem;
      }
      .hubs__title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .hubs__note {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.45;
      }
      .hub-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
        gap: 0.5rem;
      }
      .hub-card {
        text-align: center;
        text-decoration: none;
        font-size: 0.82rem;
        font-weight: 500;
        line-height: 1.25;
        padding: 0.55rem 0.5rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-muted) 40%, transparent);
        color: var(--text);
        transition:
          border-color var(--duration-fast) var(--ease-out),
          background var(--duration-fast) var(--ease-out),
          transform var(--duration-fast) var(--ease-out);
      }
      .hub-card:hover {
        border-color: var(--border-strong);
        background: color-mix(in srgb, var(--bg-muted) 65%, transparent);
        transform: translateY(-1px);
      }

      .timeline {
        margin-top: 1.1rem;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        background: color-mix(in srgb, var(--bg-elevated) 72%, transparent);
        padding: 1rem 1.1rem 1.15rem;
        display: grid;
        gap: 0.75rem;
      }
      .timeline__head {
        display: grid;
        gap: 0.35rem;
      }
      .timeline__title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
      }
      .timeline__hint {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.45;
      }
      .timeline__sub {
        margin: 0.35rem 0 0;
        font-size: 0.98rem;
        font-weight: 600;
      }
      .timeline__list {
        margin: 0;
        padding-left: 1.2rem;
        color: var(--text-muted);
        line-height: 1.45;
      }
      .timeline__form {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        align-items: flex-end;
      }
      .timeline__lbl {
        display: grid;
        gap: 0.25rem;
        font-size: 0.85rem;
        color: var(--text-muted);
      }
      .timeline__lbl.chk {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: 0.4rem;
      }
      .timeline__select,
      .timeline__input {
        font: inherit;
        padding: 0.35rem 0.5rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-muted) 40%, transparent);
        color: var(--text);
      }
      .timeline__reminders {
        margin: 0;
        padding-left: 0;
        list-style: none;
        display: grid;
        gap: 0.45rem;
      }
      .timeline__reminder-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.5rem;
        align-items: center;
        padding: 0.45rem 0.55rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.12);
      }

      .watch {
        margin-top: 1rem;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        background: color-mix(in srgb, var(--bg-elevated) 70%, transparent);
        padding: 1rem 1.1rem 1.15rem;
        display: grid;
        gap: 0.75rem;
      }
      .watch__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .watch__intro {
        display: grid;
        gap: 0.25rem;
      }
      .watch__title {
        margin: 0;
        font-size: 1.02rem;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .watch__region {
        font-size: 0.86rem;
        white-space: nowrap;
      }
      .watch__jw {
        justify-self: start;
      }
      .watch__note {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.45;
      }

      .region-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }
      .region-chip {
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-muted) 35%, transparent);
        color: var(--text);
        padding: 0.32rem 0.65rem;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition:
          background var(--duration-fast) var(--ease-out),
          border-color var(--duration-fast) var(--ease-out);
      }
      .region-chip:hover {
        border-color: var(--border-strong);
        background: color-mix(in srgb, var(--bg-muted) 60%, transparent);
      }
      .region-chip--active {
        border-color: color-mix(in srgb, var(--accent-secondary) 45%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent-secondary) 14%, transparent);
      }

      .providers {
        display: grid;
        gap: 0.65rem;
        margin-top: 0.25rem;
      }
      .providers__title {
        font-size: 0.88rem;
        color: var(--text-muted);
        font-weight: 500;
      }
      .providers__list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .providers__list--cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.55rem;
      }
      .prov {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.35rem 0.6rem;
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, #000 22%, transparent);
      }
      .prov--link {
        text-decoration: none;
        color: inherit;
        border-radius: var(--radius-md);
        padding: 0.5rem 0.65rem;
        flex-wrap: wrap;
        align-items: flex-start;
        transition:
          border-color var(--duration-fast) var(--ease-out),
          background var(--duration-fast) var(--ease-out),
          box-shadow var(--duration-fast) var(--ease-out);
      }
      .prov--link:hover {
        border-color: var(--border-strong);
        background: color-mix(in srgb, var(--bg-muted) 45%, transparent);
        box-shadow: var(--shadow-xs);
      }
      .prov--mine {
        border-color: color-mix(in srgb, var(--accent-secondary) 45%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent-secondary) 10%, transparent);
      }
      .prov__logo {
        width: 22px;
        height: 22px;
        border-radius: 5px;
        object-fit: cover;
        display: block;
        flex-shrink: 0;
      }
      .prov__name {
        font-size: 0.88rem;
        font-weight: 500;
        flex: 1 1 auto;
        min-width: 0;
      }
      .prov__kinds {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        width: 100%;
        margin-top: 0.15rem;
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
    `,
  ],
})
export class MovieDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly favorites = inject(FavoritesService);
  private readonly movies = inject(MovieService);
  readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly auth = inject(AuthService);
  private readonly streamingPrefs = inject(StreamingPrefsService);
  private readonly subsSvc = inject(ReleaseSubscriptionsService);
  private readonly watchState = inject(WatchStateService);
  private readonly storage = inject(StorageService);
  private readonly cinemaApi = inject(ServerCinemaApiService);
  private readonly serverPushSync = inject(ServerPushSyncService);

  readonly isAuthed = computed(() => this.auth.isAuthenticated());

  private readonly _releaseChannels = signal<Record<NotificationChannel, boolean>>({
    inApp: true,
    webPush: false,
    email: false,
    calendar: true,
  });
  readonly releaseSubscribeError = signal<string | null>(null);

  readonly existingReleaseSubscription = computed(() => {
    const m = this.movie();
    if (m === undefined || m === null) return null;
    return this.subsSvc.mySubscriptions().find((s) => s.tmdbId === m.id) ?? null;
  });

  private readonly _syncReleaseUi = effect(() => {
    const m = this.movie();
    const list = this.subsSvc.mySubscriptions();
    if (m === undefined || m === null) return;
    const sub = list.find((s) => s.tmdbId === m.id);
    untracked(() => {
      if (sub) {
        this._releaseChannels.set({ ...sub.channels });
      } else {
        this._releaseChannels.set({
          inApp: true,
          webPush: false,
          email: false,
          calendar: true,
        });
      }
      this.releaseSubscribeError.set(null);
    });
  });

  readonly regionChoice = signal<string | null>(null);

  private readonly locale$ = toObservable(this.i18n.tmdbLocale);

  private readonly id$ = this.route.paramMap.pipe(
    map((pm) => Number(pm.get('id'))),
    filter((id) => Number.isFinite(id) && id > 0),
    distinctUntilChanged(),
  );

  /** `undefined` — загрузка; `null` — ошибка; иначе фильм на текущей локали TMDB. */
  readonly movie = toSignal(
    combineLatest([this.id$, this.locale$]).pipe(
      switchMap(([id]) =>
        concat(
          of<Movie | null | undefined>(undefined),
          this.movies.getMovie(id).pipe(
            map((m) => m as Movie | null),
            catchError(() => of(null)),
          ),
        ),
      ),
    ),
    { initialValue: undefined as Movie | null | undefined },
  );

  readonly hasMovie = computed(() => {
    const m = this.movie();
    return m !== undefined && m !== null;
  });

  readonly detailsWatchlistLabel = computed(() => {
    const m = this.movie();
    this.watchState.sorted();
    if (m === undefined || m === null) return '—';
    const s = this.watchState.getStatus(m.id);
    if (!s) return '—';
    const labels: Record<WatchStatus, string> = {
      want: 'Want',
      watching: 'Watching',
      watched: 'Watched',
      dropped: 'Dropped',
      hidden: 'Hidden',
    };
    return labels[s];
  });

  readonly videos = toSignal(
    combineLatest([this.id$, this.locale$]).pipe(
      switchMap(([id]) =>
        concat(
          of([] as MovieVideo[]),
          this.movies.getMovieVideos(id).pipe(map((res) => res.results ?? [])),
        ),
      ),
    ),
    { initialValue: [] as MovieVideo[] },
  );

  readonly providers = toSignal(
    combineLatest([this.id$, this.locale$]).pipe(
      switchMap(([id]) =>
        concat(
          of({} as Record<string, TmdbWatchProviderCountry | undefined>),
          this.movies.getMovieWatchProviders(id).pipe(map((res) => res.results ?? {})),
        ),
      ),
    ),
    { initialValue: {} as Record<string, TmdbWatchProviderCountry | undefined> },
  );

  private readonly clearWatchRegionOnMovieChange = effect(() => {
    this.movie();
    untracked(() => this.regionChoice.set(null));
  });

  private readonly applyPreferredRegion = effect(() => {
    const avail = this.availableRegions();
    const picked = this.regionChoice();
    if (picked) return;
    const pref = this.streamingPrefs.region();
    if (pref && avail.includes(pref)) {
      untracked(() => this.regionChoice.set(pref));
    }
  });

  readonly availableRegions = computed(() => listRegionsWithData(this.providers()));

  readonly effectiveRegion = computed(() => {
    const avail = this.availableRegions();
    const picked = this.regionChoice();
    if (picked && avail.includes(picked)) return picked;
    return pickDefaultRegionCode(this.providers(), this.i18n.lang());
  });

  readonly serverJwtPresent = computed(() =>
    Boolean(this.storage.get<string>('server.jwt.token.v1', '')?.trim()),
  );

  readonly movieReleases = signal<MovieReleasesResponse | null | undefined>(undefined);
  readonly movieReleasesErr = signal<string | null>(null);
  readonly serverRemindersAll = signal<ServerReleaseReminderItem[] | undefined>(undefined);
  readonly serverReminderType = signal<'theatrical' | 'digital' | 'physical' | 'any'>('any');
  readonly serverReminderDaysBefore = signal(7);
  readonly serverReminderInApp = signal(true);

  readonly serverRemindersForMovie = computed(() => {
    const m = this.movie();
    const list = this.serverRemindersAll();
    if (m === undefined || m === null || !list) return [];
    return list.filter((r) => r.tmdbId === m.id);
  });

  private readonly syncServerSide = effect(() => {
    const m = this.movie();
    const tok = this.storage.get<string>('server.jwt.token.v1', '')?.trim();
    const region = this.effectiveRegion();
    if (m === undefined || m === null || !tok) {
      untracked(() => {
        this.movieReleases.set(undefined);
        this.serverRemindersAll.set(undefined);
        this.movieReleasesErr.set(null);
      });
      return;
    }
    untracked(() => {
      this.movieReleases.set(undefined);
      this.movieReleasesErr.set(null);
      this.cinemaApi.getMovieReleases(m.id, region).subscribe({
        next: (r) => {
          this.movieReleases.set(r);
        },
        error: () => {
          this.movieReleases.set(null);
          this.movieReleasesErr.set('failed');
        },
      });
      this.cinemaApi.listReleaseReminders().subscribe({
        next: (r) => this.serverRemindersAll.set(r?.items ?? []),
        error: () => this.serverRemindersAll.set([]),
      });
    });
  });

  readonly countryPacket = computed(() => this.providers()[this.effectiveRegion()]);

  readonly watchLinkActive = computed(() => this.countryPacket()?.link ?? null);

  readonly mergedProviders = computed(() => mergeWatchProviderRows(this.countryPacket() ?? null));

  readonly streamingCtx = computed((): StreamingContext | null => {
    const m = this.movie();
    if (m === undefined || m === null) return null;
    const y = this.releaseYear(m);
    return {
      movieTitle: m.title,
      year: y === '—' ? '' : y,
      justWatchPageUrl: this.watchLinkActive(),
      lang: this.i18n.lang(),
    };
  });

  readonly streamingHubs = computed(() => {
    const ctx = this.streamingCtx();
    return ctx ? staticStreamingHubs(ctx) : [];
  });

  readonly tmdbWatchBlockVisible = computed(() => this.availableRegions().length > 0);

  readonly trailer = computed(() => {
    const vids = this.videos();

    const normalized = vids
      .filter((v) => Boolean(v.key))
      .map((v) => ({ ...v, site: (v.site ?? '').trim() }))
      .filter((v) => v.site.length > 0);

    const isYoutubeSite = (site: string) => site.toLowerCase().includes('youtube');
    const youtube = normalized.filter((v) => isYoutubeSite(v.site));
    const nonYoutube = normalized.filter((v) => !isYoutubeSite(v.site));

    const by = (type: string, official?: boolean) =>
      normalized.find(
        (v) =>
          (v.type ?? '').toLowerCase() === type.toLowerCase() &&
          (official === undefined ? true : (v.official ?? false) === official),
      );

    // Prefer non-YouTube sources when possible (YouTube may be blocked).
    const pick = by('trailer', true) ?? by('trailer') ?? by('teaser', true) ?? by('teaser') ?? null;
    if (pick && !isYoutubeSite(pick.site)) return pick;
    return pick ?? nonYoutube[0] ?? youtube[0] ?? null;
  });

  setWatchRegion(code: string): void {
    this.regionChoice.set(code);
  }

  isMyProvider(providerName: string): boolean {
    return this.streamingPrefs.isMyProvider(providerName);
  }

  providerRowUrl(row: MergedWatchRow): string {
    const ctx = this.streamingCtx();
    if (!ctx) return '#';
    return streamingUrlForProvider(row.provider.provider_id, ctx);
  }

  kindLabel(kind: WatchKind): string {
    return this.i18n.t(`details.watch.kind.${kind}`);
  }

  toggleFavorite(m: Movie): void {
    this.favorites.toggle(m);
  }

  releaseDateForSubscribe(m: Movie): string | null {
    const d = (m.release_date ?? '').trim();
    return d.length ? d : null;
  }

  releaseChannel(c: NotificationChannel): boolean {
    return Boolean(this._releaseChannels()[c]);
  }

  setReleaseChannel(c: NotificationChannel, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._releaseChannels.set({ ...this._releaseChannels(), [c]: checked });
  }

  saveReleaseSubscription(m: Movie): void {
    this.releaseSubscribeError.set(null);
    const rd = this.releaseDateForSubscribe(m);
    if (!rd) {
      this.releaseSubscribeError.set(this.i18n.t('details.releaseNoDateSave'));
      return;
    }
    try {
      this.subsSvc.upsert({
        tmdbId: m.id,
        mediaType: 'movie',
        title: m.title,
        releaseDate: rd,
        posterPath: m.poster_path ?? null,
        channels: this._releaseChannels(),
      });
      void this.maybeSendSamplePush(m.title);
    } catch (e) {
      this.releaseSubscribeError.set(e instanceof Error ? e.message : '—');
    }
  }

  removeReleaseSubscription(id: string): void {
    this.releaseSubscribeError.set(null);
    try {
      this.subsSvc.remove(id);
    } catch (e) {
      this.releaseSubscribeError.set(e instanceof Error ? e.message : '—');
    }
  }

  setServerReminderType(ev: Event): void {
    const v = (ev.target as HTMLSelectElement).value;
    if (v === 'any' || v === 'theatrical' || v === 'digital' || v === 'physical') {
      this.serverReminderType.set(v);
    }
  }

  setServerReminderDays(v: number): void {
    this.serverReminderDaysBefore.set(this.clampInt(v, 0, 365));
  }

  clampInt(v: number, min: number, max: number): number {
    if (!Number.isFinite(v)) return min;
    return Math.min(max, Math.max(min, Math.trunc(v)));
  }

  saveServerReminder(m: Movie): void {
    this.cinemaApi
      .createReleaseReminder({
        tmdbId: m.id,
        mediaType: 'movie',
        reminderType: this.serverReminderType(),
        window: { daysBefore: this.serverReminderDaysBefore() },
        channels: {
          inApp: this.serverReminderInApp(),
          webPush: false,
          email: false,
          calendar: false,
        },
      })
      .subscribe((r) => {
        if (r?.ok) {
          this.cinemaApi.listReleaseReminders().subscribe({
            next: (x) => this.serverRemindersAll.set(x?.items ?? []),
          });
        }
      });
  }

  deleteServerReminder(id: string): void {
    this.cinemaApi.deleteReleaseReminder(id).subscribe((r) => {
      if (r?.ok) {
        this.cinemaApi.listReleaseReminders().subscribe({
          next: (x) => this.serverRemindersAll.set(x?.items ?? []),
        });
      }
    });
  }

  downloadReleaseIcs(m: Movie): void {
    const rd = this.releaseDateForSubscribe(m);
    if (!rd) return;
    const ics = buildReleaseIcs({
      title: `Release: ${m.title}`,
      date: rd,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `release-${m.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async maybeSendSamplePush(title: string): Promise<void> {
    if (!this.releaseChannel('webPush')) return;
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    await this.serverPushSync.registerIfPossible();
    new Notification('Movie Discovery', {
      body: `Пример уведомления: релиз будет в день выхода — ${title}`,
    });
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
    return tmdbImg(342, path);
  }

  posterSrcSet(path: string): string {
    return tmdbPosterSrcSet(path, [185, 342, 500]);
  }

  providerLogoUrl(path: string): string {
    return tmdbImg(45, path);
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
    const site = (v.site ?? '').trim().toLowerCase();
    const key = (v.key ?? '').trim();
    if (!key) return null;
    if (site.includes('youtube')) return this.youtubeEmbedUrl(key);
    if (site === 'vimeo') return this.vimeoEmbedUrl(key);
    return null;
  }

  externalTrailerUrl(v: MovieVideo): string | null {
    const site = (v.site ?? '').trim().toLowerCase();
    const key = (v.key ?? '').trim();
    if (!key) return null;
    if (site.includes('youtube'))
      return `https://www.youtube.com/watch?v=${encodeURIComponent(key)}`;
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
    return list
      .map((c) => c.name)
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');
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

    return s === 'rumored' || s === 'planned' || s === 'in production' || s === 'post production';
  }
}
