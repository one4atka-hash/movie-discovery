import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  forkJoin,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConfigService } from '@core/config.service';
import { pickRandomSlice, pickSubsPreview, shuffleInPlace } from '@core/release-list.util';
import { friendlyHttpErrorMessage } from '@core/http-error.util';
import { AuthService } from '@features/auth/auth.service';
import { ReleaseSubscriptionsService } from '@features/notifications/release-subscriptions.service';
import { Movie, MovieSearchResponse } from '../data-access/models/movie.model';
import { MovieService } from '../data-access/services/movie.service';
import { FavoritesService } from '../data-access/services/favorites.service';
import { LoaderComponent } from '@shared/ui/loader/loader.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { MovieCardComponent } from '../ui/movie-card/movie-card.component';
import { InfiniteScrollDirective } from '@shared/directives/infinite-scroll.directive';
import { I18nService } from '@shared/i18n/i18n.service';
import { tmdbImg, tmdbPosterSrcSet } from '@core/tmdb-images';
import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { MovieReactionsService } from '../data-access/services/movie-reactions.service';
import { RecommendationsFeedbackService } from '../data-access/services/recommendations-feedback.service';

@Component({
  selector: 'app-movie-search-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LoaderComponent,
    EmptyStateComponent,
    MovieCardComponent,
    InfiniteScrollDirective,
    BottomSheetComponent,
    ButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="api-warning" *ngIf="!hasTmdbApiKey" role="status">
        <strong>Ключ TMDB не задан.</strong>
        Укажите его в <code>public/env.js</code> (скопируйте из <code>public/env.example.js</code>)
        или в переменных окружения при сборке. Ключ выдаётся бесплатно на
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer noopener"
          >themoviedb.org → Settings → API</a
        >.
      </div>

      <div class="searchBar" id="home-search">
        <input
          class="searchBar__input"
          [formControl]="queryControl"
          placeholder="Введите название фильма…"
          autocomplete="off"
          aria-label="Поиск фильма"
        />
      </div>

      <div class="dashboard" *ngIf="showHero()">
        <div class="dashboard__layout">
          <aside class="dashboard__rail" [attr.aria-label]="i18n.t('home.railAria')">
            <section class="railBlock" id="home-subs" aria-labelledby="home-subs-title">
              <div class="railBlock__head">
                <h2 class="railBlock__title" id="home-subs-title">
                  {{ i18n.t('home.section.subscriptions') }}
                </h2>
                <a
                  *ngIf="showSubsSeeAll()"
                  class="railBlock__more"
                  routerLink="/account"
                  fragment="account-subs"
                  >{{ i18n.t('home.subsSeeAll') }}</a
                >
              </div>

              <ng-container *ngIf="isAuthed(); else subsGuest">
                <p class="railBlock__empty" *ngIf="!subsCount()">
                  {{ i18n.t('notifications.empty') }}
                </p>
                <ul class="railList" *ngIf="subsCount()">
                  <li class="railList__row" *ngFor="let s of subsPreview(); trackBy: trackBySubId">
                    <a class="railSub" [routerLink]="['/movie', s.tmdbId]">
                      <div class="railSub__thumb" [class.railSub__thumb--empty]="!s.posterPath">
                        <img
                          *ngIf="s.posterPath as sp"
                          [src]="posterUrlSmall(sp)"
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div class="railSub__text">
                        <span class="railSub__title">{{ s.title }}</span>
                        <span class="railSub__date">{{ s.releaseDate || '—' }}</span>
                      </div>
                    </a>
                    <button
                      type="button"
                      class="railSub__remove"
                      (click)="removeSub(s.id)"
                      [attr.aria-label]="i18n.t('notifications.remove')"
                    >
                      ×
                    </button>
                  </li>
                </ul>
              </ng-container>
              <ng-template #subsGuest>
                <p class="railBlock__hint">{{ i18n.t('home.loginForSubs') }}</p>
                <a class="btn btn--primary railBlock__btn" routerLink="/account">{{
                  i18n.t('account.login')
                }}</a>
              </ng-template>
            </section>

            <section class="railBlock" id="home-favorites" aria-labelledby="home-fav-title">
              <div class="railBlock__head">
                <h2 class="railBlock__title" id="home-fav-title">
                  {{ i18n.t('home.section.favorites') }}
                </h2>
                <a
                  *ngIf="showFavSeeAll()"
                  class="railBlock__more"
                  routerLink="/account"
                  fragment="account-favorites"
                  >{{ i18n.t('home.favoritesSeeAll') }}</a
                >
              </div>
              <p class="railBlock__empty" *ngIf="!favCount()">
                {{ i18n.t('home.favoritesEmptySubtitle') }}
              </p>
              <ul class="railList railList--fav" *ngIf="favCount()">
                <li class="railList__row" *ngFor="let m of favoritesPreview(); trackBy: trackById">
                  <a class="railFav" [routerLink]="['/movie', m.id]">
                    <div class="railFav__thumb" [class.railFav__thumb--empty]="!m.poster_path">
                      <img
                        *ngIf="m.poster_path as p"
                        [src]="posterUrlSmall(p)"
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <span class="railFav__title">{{ m.title }}</span>
                  </a>
                </li>
              </ul>
            </section>
          </aside>

          <div class="dashboard__main">
            <section class="dashSection" id="home-new" aria-labelledby="home-new-title">
              <h2 class="dashSection__title" id="home-new-title">
                {{ i18n.t('home.section.newReleases') }}
              </h2>
              <div class="spotlight__strip" *ngIf="nowPlayingLoading()">
                <div
                  class="spotlight__skel"
                  *ngFor="let _ of rowSkeletonSlots; trackBy: trackByIndex"
                ></div>
              </div>
              <div class="spotlight__strip" *ngIf="!nowPlayingLoading() && nowPlaying().length">
                <a
                  class="spotlight__tile"
                  *ngFor="let m of nowPlaying(); trackBy: trackById"
                  [routerLink]="['/movie', m.id]"
                >
                  <div class="spotlight__poster" [class.spotlight__poster--empty]="!m.poster_path">
                    <img
                      *ngIf="m.poster_path as p"
                      class="spotlight__img"
                      [src]="posterUrl(p)"
                      [attr.srcset]="posterSrcSet(p)"
                      sizes="(max-width: 520px) 30vw, 120px"
                      [alt]="m.title"
                      referrerpolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <span class="spotlight__name">{{ m.title }}</span>
                </a>
              </div>
              <p
                class="spotlight__err"
                *ngIf="!nowPlayingLoading() && nowPlayingError()"
                role="status"
              >
                {{ nowPlayingError() }}
              </p>
            </section>

            <section class="dashSection" id="home-recs" aria-labelledby="home-recs-title">
              <div class="dashSection__head">
                <h2 class="dashSection__title" id="home-recs-title">
                  {{ i18n.t('home.section.recommendations') }}
                </h2>
                <button
                  type="button"
                  class="btn btn--icon btn--refresh"
                  (click)="refreshRecommendations()"
                  [disabled]="recsLoading()"
                  [attr.aria-label]="i18n.t('home.recommendationsRefreshAria')"
                  [title]="i18n.t('home.recommendationsRefresh')"
                >
                  <span aria-hidden="true" class="btn__refreshIcon">↻</span>
                </button>
              </div>
              <div class="grid grid--random" *ngIf="recsLoading()">
                <div
                  class="skeleton-card"
                  *ngFor="let _ of randomSkeletonSlots; trackBy: trackByIndex"
                ></div>
              </div>
              <div class="grid grid--random" *ngIf="!recsLoading() && recsVisible().length">
                <div class="grid__item" *ngFor="let m of recsVisible(); trackBy: trackById">
                  <a class="grid__link" [routerLink]="['/movie', m.id]">
                    <app-movie-card [movie]="m" />
                  </a>
                  <button class="whyBtn" type="button" (click)="openWhy(m)" aria-label="Why this?">
                    Why?
                  </button>
                </div>
              </div>
              <p
                class="muted"
                *ngIf="!recsLoading() && !recsVisible().length && !recsError()"
                role="status"
              >
                {{ i18n.t('home.recommendationsEmpty') }}
              </p>
              <p class="muted" *ngIf="!recsLoading() && recsError()" role="status">
                {{ recsError() }}
              </p>
            </section>

            <section class="dashSection" id="home-random" aria-labelledby="home-rand-title">
              <h2 class="dashSection__title" id="home-rand-title">
                {{ i18n.t('home.section.random') }}
              </h2>
              <div class="grid grid--random" *ngIf="randomLoading()">
                <div
                  class="skeleton-card"
                  *ngFor="let _ of randomSkeletonSlots; trackBy: trackByIndex"
                ></div>
              </div>
              <div class="grid grid--random" *ngIf="!randomLoading() && randomMovies().length">
                <a
                  class="grid__item"
                  *ngFor="let m of randomMovies(); trackBy: trackById"
                  [routerLink]="['/movie', m.id]"
                >
                  <app-movie-card [movie]="m" />
                </a>
              </div>
              <p class="muted" *ngIf="!randomLoading() && randomError()" role="status">
                {{ randomError() }}
              </p>
            </section>
          </div>
        </div>
      </div>

      <div class="skeleton-grid" *ngIf="loading() && !showHero()">
        <div class="skeleton-card" *ngFor="let _ of skeletonSlots; trackBy: trackByIndex"></div>
      </div>

      <app-empty-state
        *ngIf="!showHero() && !loading() && error()"
        title="Ошибка запроса"
        [subtitle]="error()"
      />

      <app-empty-state
        *ngIf="!showHero() && !loading() && !error() && showEmpty()"
        title="Ничего не найдено"
        subtitle="Попробуйте другой запрос."
      />

      <div class="grid" *ngIf="!showHero() && !loading() && !error() && movies().length">
        <a
          class="grid__item"
          *ngFor="let m of movies(); trackBy: trackById"
          [routerLink]="['/movie', m.id]"
        >
          <app-movie-card [movie]="m" />
        </a>
      </div>

      <div class="more" *ngIf="loadingMore()">
        <app-loader />
      </div>

      <div
        class="sentinel"
        appInfiniteScroll
        [disabled]="!canLoadMore()"
        (reached)="loadNextPage()"
      ></div>

      <app-bottom-sheet
        [open]="whyOpen()"
        title="Why this?"
        ariaLabel="Recommendation explanation"
        (closed)="closeWhy()"
      >
        @if (whyMovie(); as m) {
          <p class="muted">
            Рекомендация построена на TMDB recommendations и ваших сигналах (избранное/реакции).
          </p>
          @if (recsSeeds().length) {
            <p class="muted">
              Seeds из избранного:
              <strong>{{ recsSeeds().map((x) => x.title).join(', ') }}</strong>
            </p>
          }
          <div class="whyActions">
            <app-button variant="secondary" [routerLink]="['/movie', m.id]">Открыть</app-button>
            <app-button variant="ghost" (click)="lessLikeThis(m.id)">Less like this</app-button>
            <app-button variant="danger" (click)="hideRec(m.id)">Hide</app-button>
          </div>
        }
      </app-bottom-sheet>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
      }

      .api-warning {
        margin: 0 0 1rem;
        padding: 0.85rem 1.05rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--surface-warning-border);
        background: var(--surface-warning-bg);
        color: var(--text);
        font-size: 0.9rem;
        line-height: 1.5;
        box-shadow: var(--shadow-xs);
      }
      .api-warning code {
        font-size: 0.86em;
        padding: 0.12em 0.4em;
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-muted) 70%, transparent);
        border: 1px solid var(--border-subtle);
      }
      .api-warning a {
        color: var(--link);
        font-weight: 500;
      }
      .api-warning a:hover {
        color: var(--link-hover);
      }

      .searchBar {
        margin: 0 0 1.25rem;
      }
      .searchBar__input {
        width: 100%;
        padding: 0.95rem 1.05rem;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
        color: var(--text);
        outline: none;
        font-family: inherit;
        font-size: 1.02rem;
        letter-spacing: -0.02em;
        box-shadow: var(--shadow-xs);
        transition:
          border-color var(--duration-fast) var(--ease-out),
          box-shadow var(--duration-fast) var(--ease-out);
      }
      .searchBar__input:focus {
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border-subtle));
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
      }
      .searchBar__input:focus-visible {
        outline: none;
      }

      .dashboard {
        margin-top: 0.25rem;
      }

      .dashboard__layout {
        display: flex;
        align-items: flex-start;
        gap: 1.15rem;
      }

      .dashboard__rail {
        width: min(100%, 280px);
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .dashboard__main {
        flex: 1;
        min-width: 0;
        display: grid;
        gap: 1.35rem;
      }

      @media (max-width: 900px) {
        .dashboard__layout {
          flex-direction: column;
        }
        .dashboard__rail {
          width: 100%;
          order: 2;
        }
        .dashboard__main {
          order: 1;
        }
      }

      .railBlock {
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 90%, transparent);
        padding: 0.75rem 0.8rem;
        box-shadow: var(--shadow-xs);
      }

      .railBlock__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.55rem;
      }

      .railBlock__title {
        margin: 0;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-muted);
      }

      .railBlock__more {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--link);
        text-decoration: none;
        white-space: nowrap;
      }
      .railBlock__more:hover {
        color: var(--link-hover);
        text-decoration: underline;
        text-underline-offset: 0.12em;
      }

      .railBlock__empty,
      .railBlock__hint {
        margin: 0;
        font-size: 0.86rem;
        line-height: 1.45;
        color: var(--text-muted);
      }

      .railBlock__btn {
        margin-top: 0.45rem;
      }

      .railList {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .railList__row {
        display: flex;
        align-items: stretch;
        gap: 0.25rem;
        min-height: 3.25rem;
      }

      .railSub {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.35rem;
        border-radius: var(--radius-md);
        text-decoration: none;
        color: inherit;
        transition: background var(--duration-fast) var(--ease-out);
      }
      .railSub:hover {
        background: color-mix(in srgb, var(--bg-muted) 55%, transparent);
      }

      .railSub__thumb {
        width: 36px;
        height: 54px;
        flex: 0 0 auto;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
      }
      .railSub__thumb--empty {
        background: linear-gradient(145deg, rgba(255, 107, 107, 0.18), rgba(255, 195, 113, 0.1));
      }
      .railSub__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .railSub__text {
        display: flex;
        flex-direction: column;
        gap: 0.12rem;
        min-width: 0;
      }

      .railSub__title {
        font-size: 0.84rem;
        font-weight: 600;
        line-height: 1.25;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .railSub__date {
        font-size: 0.75rem;
        color: var(--accent-secondary);
        font-variant-numeric: tabular-nums;
      }

      .railSub__remove {
        flex: 0 0 auto;
        width: 1.65rem;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--text-muted);
        font-size: 1.15rem;
        line-height: 1;
        cursor: pointer;
        align-self: center;
        transition:
          color var(--duration-fast) var(--ease-out),
          background var(--duration-fast) var(--ease-out);
      }
      .railSub__remove:hover {
        color: var(--accent);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
      }

      .railFav {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.35rem;
        border-radius: var(--radius-md);
        text-decoration: none;
        color: inherit;
        transition: background var(--duration-fast) var(--ease-out);
      }
      .railFav:hover {
        background: color-mix(in srgb, var(--bg-muted) 55%, transparent);
      }

      .railFav__thumb {
        width: 32px;
        height: 48px;
        flex: 0 0 auto;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
      }
      .railFav__thumb--empty {
        background: linear-gradient(145deg, rgba(255, 107, 107, 0.18), rgba(255, 195, 113, 0.1));
      }
      .railFav__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .railFav__title {
        font-size: 0.82rem;
        font-weight: 500;
        line-height: 1.25;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .dashSection {
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background:
          radial-gradient(
            1200px 400px at 10% 0%,
            color-mix(in srgb, var(--accent) 14%, transparent),
            transparent 55%
          ),
          color-mix(in srgb, var(--bg-elevated) 88%, transparent);
        padding: 1.1rem 1.15rem;
        box-shadow: var(--shadow-xs);
      }
      .dashSection__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
      }

      .dashSection__head .dashSection__title {
        margin: 0;
        flex: 1;
        min-width: 0;
      }

      .dashSection__title {
        margin: 0 0 0.85rem;
        font-size: 1.08rem;
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      .btn--icon {
        padding: 0.45rem 0.55rem;
        min-width: 2.25rem;
        min-height: 2.25rem;
      }

      .btn--refresh {
        flex-shrink: 0;
      }

      .btn__refreshIcon {
        display: inline-block;
        font-size: 1.15rem;
        line-height: 1;
        transition: transform 0.35s ease;
      }

      .btn--refresh:not(:disabled):hover .btn__refreshIcon {
        transform: rotate(-180deg);
      }

      .muted {
        margin: 0 0 0.65rem;
        color: var(--text-muted);
        line-height: 1.5;
      }

      .btn {
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
        padding: 0.55rem 0.9rem;
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
        margin-top: 0.35rem;
        border-color: rgba(255, 195, 113, 0.45);
        background: rgba(255, 195, 113, 0.14);
      }

      .spotlight__strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.65rem;
      }
      @media (min-width: 520px) {
        .spotlight__strip {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
      }
      .spotlight__tile {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        text-decoration: none;
        color: inherit;
        border-radius: var(--radius-md);
        padding: 0.2rem;
        margin: -0.2rem;
        transition:
          transform var(--duration-normal) var(--ease-out),
          filter var(--duration-normal) var(--ease-out);
      }
      .spotlight__tile:hover {
        transform: translateY(-3px);
        filter: brightness(1.05);
      }
      .spotlight__tile:focus-visible {
        outline: var(--focus-ring);
        outline-offset: 3px;
      }
      .spotlight__poster {
        aspect-ratio: 2 / 3;
        border-radius: var(--radius-sm);
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-muted) 50%, transparent);
        box-shadow: var(--shadow-sm);
      }
      .spotlight__poster--empty {
        background: linear-gradient(
          145deg,
          color-mix(in srgb, var(--accent) 22%, transparent),
          color-mix(in srgb, var(--accent-secondary) 14%, transparent)
        );
      }
      .spotlight__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .spotlight__name {
        font-size: 0.78rem;
        line-height: 1.25;
        color: var(--text-muted);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .spotlight__skel {
        aspect-ratio: 2 / 3;
        border-radius: 12px;
        border: 1px solid var(--border-subtle);
        background: linear-gradient(
          100deg,
          rgba(255, 255, 255, 0.06) 20%,
          rgba(255, 255, 255, 0.14) 38%,
          rgba(255, 255, 255, 0.06) 56%
        );
        background-size: 200% 100%;
        animation: shimmer 1.25s linear infinite;
      }
      .spotlight__err {
        margin: 0.5rem 0 0;
        font-size: 0.88rem;
        color: var(--text-muted);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
        margin-top: 0.25rem;
        justify-items: start;
      }
      .grid--random {
        margin-top: 0;
      }
      .grid__item {
        width: 100%;
        max-width: 220px;
        text-decoration: none;
        color: inherit;
      }
      .grid__item:hover {
        transform: translateY(-2px);
        transition: transform 0.18s ease;
      }

      .grid__item {
        position: relative;
      }

      .grid__link {
        display: block;
        text-decoration: none;
        color: inherit;
      }

      .whyBtn {
        position: absolute;
        top: 10px;
        right: 10px;
        border-radius: var(--radius-full);
        border: 1px solid color-mix(in srgb, var(--border-strong) 80%, transparent);
        background: color-mix(in srgb, #000 52%, transparent);
        color: rgba(255, 255, 255, 0.92);
        cursor: pointer;
        font-size: 12px;
        padding: 0.35rem 0.55rem;
        backdrop-filter: blur(6px);
      }

      .whyBtn:hover {
        border-color: var(--border-strong);
        background: color-mix(in srgb, #000 62%, transparent);
      }

      .whyActions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-top: 0.9rem;
      }

      .skeleton-grid {
        margin-top: 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
        justify-items: start;
      }
      .skeleton-card {
        width: 100%;
        max-width: 220px;
        height: 300px;
        border-radius: 14px;
        background: linear-gradient(
          100deg,
          rgba(255, 255, 255, 0.06) 20%,
          rgba(255, 255, 255, 0.16) 35%,
          rgba(255, 255, 255, 0.06) 50%
        );
        background-size: 200% 100%;
        animation: shimmer 1.25s linear infinite;
      }

      .more {
        margin-top: 1rem;
      }

      .sentinel {
        height: 1px;
      }

      @keyframes shimmer {
        to {
          background-position-x: -200%;
        }
      }
    `,
  ],
})
export class MovieSearchPageComponent {
  private readonly api = inject(MovieService);
  private readonly config = inject(ConfigService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly subsSvc = inject(ReleaseSubscriptionsService);
  private readonly fav = inject(FavoritesService);
  private readonly reactions = inject(MovieReactionsService);
  private readonly recsFeedback = inject(RecommendationsFeedbackService);
  readonly i18n = inject(I18nService);

  /** Есть ли ключ для запросов к TMDB (env / window.__env). */
  get hasTmdbApiKey(): boolean {
    return Boolean(this.config.api.apiKey);
  }

  readonly queryControl = new FormControl<string>('', { nonNullable: true });

  /** Слоты для skeleton — отдельный массив, чтобы strict шаблон не ругался на литералы в *ngFor */
  readonly skeletonSlots = [0, 1, 2, 3, 4, 5] as const;
  readonly rowSkeletonSlots = [0, 1, 2, 3, 4, 5] as const;
  readonly randomSkeletonSlots = [0, 1, 2, 3, 4, 5, 6, 7] as const;

  private readonly _movies = signal<Movie[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _hasSearched = signal(false);
  private readonly _query = signal<string>('');
  private readonly _page = signal(1);
  private readonly _totalPages = signal(1);
  private readonly _draft = signal('');

  private readonly _nowPlaying = signal<Movie[]>([]);
  private readonly _nowPlayingLoading = signal(true);
  private readonly _nowPlayingError = signal<string | null>(null);

  private readonly _randomMovies = signal<Movie[]>([]);
  private readonly _randomLoading = signal(true);
  private readonly _randomError = signal<string | null>(null);

  private readonly _recs = signal<Movie[]>([]);
  private readonly _recsLoading = signal(true);
  private readonly _recsError = signal<string | null>(null);
  private readonly _recsSeeds = signal<Movie[]>([]);

  readonly movies = computed(() => this._movies());
  readonly loading = computed(() => this._loading());
  readonly loadingMore = computed(() => this._loadingMore());
  readonly error = computed(() => this._error());
  readonly nowPlaying = computed(() => this._nowPlaying());
  readonly nowPlayingLoading = computed(() => this._nowPlayingLoading());
  readonly nowPlayingError = computed(() => this._nowPlayingError());
  readonly randomMovies = computed(() => this._randomMovies());
  readonly randomLoading = computed(() => this._randomLoading());
  readonly randomError = computed(() => this._randomError());
  readonly recs = computed(() => this._recs());
  readonly recsLoading = computed(() => this._recsLoading());
  readonly recsError = computed(() => this._recsError());
  readonly recsSeeds = computed(() => this._recsSeeds());
  readonly recsVisible = computed(() =>
    this._recs().filter(
      (m) => !this.recsFeedback.isHidden(m.id) && this.reactions.reactionFor(m.id)() !== 'dislike',
    ),
  );

  readonly whyOpen = signal(false);
  readonly whyMovie = signal<Movie | null>(null);
  private readonly _subsAll = computed(() => this.subsSvc.mySubscriptions());
  private readonly _favAll = computed(() => this.fav.favorites());
  readonly subsCount = computed(() => this._subsAll().length);
  readonly favCount = computed(() => this._favAll().length);
  readonly subsPreview = computed(() => pickSubsPreview(this._subsAll(), 5));
  readonly favoritesPreview = computed(() => pickRandomSlice(this._favAll(), 5));
  readonly showSubsSeeAll = computed(() => this.subsCount() > 5);
  readonly showFavSeeAll = computed(() => this.favCount() > 5);
  readonly isAuthed = computed(() => this.auth.isAuthenticated());

  readonly showHero = computed(() => this._draft().trim().length < 2);
  readonly showEmpty = computed(() => this._hasSearched() && this._movies().length === 0);
  readonly canLoadMore = computed(
    () =>
      this._hasSearched() &&
      !this._loading() &&
      !this._loadingMore() &&
      !this._error() &&
      this._movies().length > 0 &&
      this._page() < this._totalPages(),
  );

  private localeHeroN = 0;

  constructor() {
    this._draft.set(this.queryControl.value);
    this.loadNowPlaying();
    this.loadRecommendations();
    this.loadRandomStrip();
    effect(() => {
      this.i18n.tmdbLocale();
      if (this.localeHeroN++ === 0) return;
      untracked(() => this.reloadAfterLocaleChange());
    });
    this.queryControl.valueChanges
      .pipe(
        tap((q) => this._draft.set(q)),
        debounceTime(350),
        distinctUntilChanged(),
        tap(() => {
          this._error.set(null);
        }),
        filter((q) => q.trim().length >= 2),
        tap(() => {
          this._hasSearched.set(true);
          this._loading.set(true);
          this._loadingMore.set(false);
        }),
        switchMap((q) =>
          this.api.searchMovies(q.trim(), 1).pipe(
            catchError((err: unknown) => {
              this._error.set(friendlyHttpErrorMessage(err, 'Поиск'));
              this._loading.set(false);
              return of(EMPTY_SEARCH_RESPONSE);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this._movies.set(res.results ?? []);
          this._query.set(this.queryControl.value.trim());
          this._page.set(res.page ?? 1);
          this._totalPages.set(res.total_pages ?? 1);
          this._loading.set(false);
        },
      });
  }

  loadNextPage(): void {
    if (!this.canLoadMore()) return;
    const nextPage = this._page() + 1;
    const query = this._query();

    this._loadingMore.set(true);
    this._error.set(null);

    this.api
      .searchMovies(query, nextPage)
      .pipe(
        catchError((err: unknown) => {
          this._error.set(friendlyHttpErrorMessage(err, 'Подгрузка страницы'));
          this._loadingMore.set(false);
          return of({
            page: nextPage,
            results: [] as Movie[],
            total_pages: this._totalPages(),
            total_results: 0,
          } satisfies MovieSearchResponse);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this._movies.set([...this._movies(), ...(res.results ?? [])]);
          this._page.set(res.page ?? nextPage);
          this._totalPages.set(res.total_pages ?? this._totalPages());
          this._loadingMore.set(false);
        },
      });
  }

  removeSub(id: string): void {
    try {
      this.subsSvc.remove(id);
    } catch {
      /* ignore */
    }
  }

  trackById(_: number, m: Movie): number {
    return m.id;
  }

  trackBySubId(_: number, s: { id: string }): string {
    return s.id;
  }

  trackByIndex(i: number): number {
    return i;
  }

  posterUrl(path: string): string {
    return tmdbImg(185, path);
  }

  posterUrlSmall(path: string): string {
    return tmdbImg(92, path);
  }

  posterSrcSet(path: string): string {
    return tmdbPosterSrcSet(path);
  }

  private reloadAfterLocaleChange(): void {
    this.loadNowPlaying();
    this.loadRecommendations();
    this.loadRandomStrip();
    const q = this.queryControl.value.trim();
    if (!this._hasSearched() || q.length < 2) return;
    this._loading.set(true);
    this._error.set(null);
    this.api
      .searchMovies(q, 1)
      .pipe(
        catchError((err: unknown) => {
          this._error.set(friendlyHttpErrorMessage(err, 'Поиск'));
          this._loading.set(false);
          return of(EMPTY_SEARCH_RESPONSE);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this._movies.set(res.results ?? []);
          this._query.set(q);
          this._page.set(res.page ?? 1);
          this._totalPages.set(res.total_pages ?? 1);
          this._loading.set(false);
        },
      });
  }

  private loadNowPlaying(): void {
    this._nowPlayingLoading.set(true);
    this._nowPlayingError.set(null);
    this.api
      .getNowPlayingMovies(1)
      .pipe(
        catchError((err: unknown) => {
          this._nowPlayingError.set(friendlyHttpErrorMessage(err, 'Новинки'));
          this._nowPlayingLoading.set(false);
          return of(EMPTY_SEARCH_RESPONSE);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        const list = [...(res.results ?? [])];
        shuffleInPlace(list);
        const withPoster = list.filter((m) => m.poster_path);
        const pool = withPoster.length >= 6 ? withPoster : list;
        this._nowPlaying.set(pool.slice(0, 6));
        this._nowPlayingLoading.set(false);
      });
  }

  refreshRecommendations(): void {
    this.loadRecommendations();
  }

  private loadRandomStrip(): void {
    this._randomLoading.set(true);
    this._randomError.set(null);
    const page = Math.floor(Math.random() * 15) + 1;
    this.api
      .getPopularMovies(page)
      .pipe(
        catchError((err: unknown) => {
          this._randomError.set(friendlyHttpErrorMessage(err, 'Подборка'));
          this._randomLoading.set(false);
          return of(EMPTY_SEARCH_RESPONSE);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        const list = [...(res.results ?? [])];
        shuffleInPlace(list);
        this._randomMovies.set(list.slice(0, 8));
        this._randomLoading.set(false);
      });
  }

  private loadRecommendations(): void {
    this._recsLoading.set(true);
    this._recsError.set(null);

    const favorites = this._favAll();
    if (!favorites.length) {
      this._recs.set([]);
      this._recsSeeds.set([]);
      this._recsLoading.set(false);
      return;
    }

    const seedIds = favorites
      .map((m) => m.id)
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, 3);
    this._recsSeeds.set(favorites.filter((m) => seedIds.includes(m.id)));

    if (!seedIds.length) {
      this._recs.set([]);
      this._recsSeeds.set([]);
      this._recsLoading.set(false);
      return;
    }

    forkJoin(
      seedIds.map((id) =>
        this.api.getMovieRecommendations(id, 1).pipe(
          catchError((err: unknown) => {
            // Keep a single readable error, but don't fail the whole block.
            this._recsError.set(friendlyHttpErrorMessage(err, 'Рекомендации'));
            return of(EMPTY_SEARCH_RESPONSE);
          }),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((responses) => {
        const banned = new Set(seedIds);
        const out: Movie[] = [];
        const seen = new Set<number>();
        for (const res of responses) {
          for (const m of res.results ?? []) {
            if (!m?.id || banned.has(m.id) || seen.has(m.id)) continue;
            seen.add(m.id);
            out.push(m);
          }
        }
        const withPoster = out.filter((m) => m.poster_path);
        const pool = withPoster.length >= 8 ? withPoster : out;
        shuffleInPlace(pool);
        this._recs.set(pool.slice(0, 8));
        this._recsLoading.set(false);
      });
  }

  openWhy(m: Movie): void {
    this.whyMovie.set(m);
    this.whyOpen.set(true);
  }

  closeWhy(): void {
    this.whyOpen.set(false);
    this.whyMovie.set(null);
  }

  hideRec(id: number): void {
    this.recsFeedback.hide(id);
    this.closeWhy();
  }

  lessLikeThis(id: number): void {
    this.reactions.toggle(id, 'dislike');
    this.closeWhy();
  }
}

const EMPTY_SEARCH_RESPONSE: MovieSearchResponse = {
  page: 1,
  results: [],
  total_pages: 1,
  total_results: 0,
};
