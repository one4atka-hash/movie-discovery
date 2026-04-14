import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { sortSubscriptionsByRelease } from '@core/release-list.util';
import { AuthService } from './auth.service';
import { ReleaseSubscriptionsService } from '@features/notifications/release-subscriptions.service';
import { MovieCardComponent } from '@features/movies/ui/movie-card/movie-card.component';
import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import { I18nService } from '@shared/i18n/i18n.service';
import { tmdbImg } from '@core/tmdb-images';
import { StreamingPrefsService } from '@features/streaming/streaming-prefs.service';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ChipComponent } from '@shared/ui/chip/chip.component';
import { StreamingCatalogService } from '@features/streaming/streaming-catalog.service';
import { StorageService } from '@core/storage.service';
import {
  ServerCinemaApiService,
  type EmbeddingsJobItem,
  type MePublicProfile,
} from '@core/server-cinema-api.service';
import {
  ExportsApiService,
  type ExportFormat,
  type ExportKind,
} from '@features/exports/exports-api.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MovieCardComponent,
    BadgeComponent,
    BottomSheetComponent,
    ChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">← {{ i18n.t('nav.home') }}</a>

      <header class="head">
        <h1 class="title">{{ i18n.t('account.title') }}</h1>
        <p class="sub">{{ i18n.t('account.subtitle') }}</p>
      </header>

      <section
        class="account-block"
        id="account-share-cards"
        aria-labelledby="account-share-cards-title"
      >
        <h2 class="account-block__title" id="account-share-cards-title">
          {{ i18n.t('account.shareCards.title') }}
        </h2>
        <p class="muted">{{ i18n.t('account.shareCards.hint') }}</p>
        <a class="btn btn--primary" routerLink="/share">{{ i18n.t('account.shareCards.open') }}</a>
      </section>

      <section class="account-block" id="account-me-hub" aria-labelledby="account-me-hub-title">
        <h2 class="account-block__title" id="account-me-hub-title">
          {{ i18n.t('account.meHub.title') }}
        </h2>
        <p class="muted">{{ i18n.t('account.meHub.hint') }}</p>
        <a class="btn btn--primary" routerLink="/me">{{ i18n.t('account.meHub.open') }}</a>
      </section>

      <ng-container *ngIf="user() as u; else authTpl">
        <div class="card card--who">
          <p class="muted">{{ i18n.t('account.loggedInAs') }}</p>
          <strong>{{ u.email }}</strong>
          <div class="actions">
            <button class="btn" type="button" (click)="logout()">
              {{ i18n.t('account.logout') }}
            </button>
          </div>
        </div>

        <section class="account-block" id="account-data" aria-labelledby="account-data-title">
          <h2 class="account-block__title" id="account-data-title">Данные</h2>
          <p class="muted">
            Здесь можно выгрузить свои данные и при необходимости импортировать их обратно.
          </p>
          <div class="card">
            <label class="field">
              <span>Код подключения (опционально)</span>
              <textarea
                class="input"
                rows="2"
                [formControl]="serverJwt"
                placeholder="eyJhbGciOi..."
              ></textarea>
            </label>

            <div class="actions" style="margin-top: 0">
              <button class="btn" type="button" [routerLink]="['/import']">Импорт</button>
            </div>

            <div class="actions" style="align-items: flex-end">
              <label class="field" style="margin-bottom: 0; flex: 1 1 180px; max-width: 220px">
                <span>Раздел</span>
                <select class="input" [formControl]="exportKind">
                  <option value="diary">diary</option>
                  <option value="watch_state">watch_state</option>
                  <option value="favorites">favorites</option>
                </select>
              </label>
              <label class="field" style="margin-bottom: 0; flex: 1 1 140px; max-width: 200px">
                <span>Формат</span>
                <select class="input" [formControl]="exportFormat">
                  <option value="csv">csv</option>
                  <option value="json">json</option>
                </select>
              </label>
              <button
                class="btn btn--primary"
                type="button"
                (click)="downloadExport()"
                [disabled]="busy()"
              >
                Скачать
              </button>
            </div>

            <p class="err" *ngIf="exportError()">{{ exportError() }}</p>

            <div class="field" style="margin-top: 0.35rem">
              <span>{{ i18n.t('account.emailDev.hint') }}</span>
              <div class="actions" style="margin-top: 0">
                <button
                  class="btn"
                  type="button"
                  (click)="sendDevTestEmail()"
                  [disabled]="emailDevBusy()"
                >
                  {{ i18n.t('account.emailDev.button') }}
                </button>
              </div>
              <p class="ok" *ngIf="emailDevOk()">{{ emailDevOk() }}</p>
              <p class="err" *ngIf="emailDevErr()" style="margin-bottom: 0">{{ emailDevErr() }}</p>
            </div>

            <div class="field" style="margin-top: 0.35rem">
              <span>Movie features cache (server)</span>
              <p class="muted" style="margin: 0.35rem 0 0">
                Прогреть кэш TMDB фич (title/overview/credits/keywords) для твоих favorites/likes.
              </p>
              <div class="actions" style="margin-top: 0">
                <label class="field" style="margin-bottom: 0; flex: 1 1 140px; max-width: 200px">
                  <span>Limit</span>
                  <select class="input" [formControl]="featuresLimit">
                    <option [ngValue]="10">10</option>
                    <option [ngValue]="30">30</option>
                    <option [ngValue]="50">50</option>
                  </select>
                </label>
                <label class="field" style="margin-bottom: 0; flex: 1 1 140px; max-width: 220px">
                  <span>Language (optional)</span>
                  <input class="input" [formControl]="featuresLanguage" placeholder="en" />
                </label>
              </div>
              <div class="actions" style="margin-top: 0">
                <button
                  class="btn"
                  type="button"
                  (click)="refreshMyMovieFeatures()"
                  [disabled]="featuresBusy()"
                >
                  Refresh movie features
                </button>
              </div>
              <p class="ok" *ngIf="featuresOk()">{{ featuresOk() }}</p>
              <p class="err" *ngIf="featuresErr()" style="margin-bottom: 0">{{ featuresErr() }}</p>
              <details *ngIf="featuresErrors().length" class="why" style="margin-top: 0.65rem">
                <summary class="why__sum">Ошибки ({{ featuresErrors().length }})</summary>
                <ul class="why__list">
                  <li *ngFor="let e of featuresErrors()">
                    <b>TMDB {{ e.tmdbId }}</b> — {{ e.error }}
                  </li>
                </ul>
              </details>
            </div>

            <div class="field" style="margin-top: 0.9rem">
              <span>Embeddings jobs (server)</span>
              <p class="muted" style="margin: 0.35rem 0 0">
                История задач генерации эмбеддингов для ANN-рекомендаций.
              </p>
              <div class="actions" style="margin-top: 0">
                <label class="field" style="margin-bottom: 0; flex: 1 1 140px; max-width: 220px">
                  <span>Limit</span>
                  <select class="input" [formControl]="embeddingsLimit">
                    <option [ngValue]="20">20</option>
                    <option [ngValue]="50">50</option>
                    <option [ngValue]="100">100</option>
                    <option [ngValue]="200">200</option>
                  </select>
                </label>
                <button
                  class="btn btn--primary"
                  type="button"
                  (click)="createAndRunMyEmbeddingsJob()"
                  [disabled]="jobsBusy()"
                >
                  Create + Run (from my favorites/likes)
                </button>
                <button
                  class="btn"
                  type="button"
                  (click)="loadEmbeddingsJobs()"
                  [disabled]="jobsBusy()"
                >
                  Load jobs
                </button>
              </div>
              <p class="ok" *ngIf="jobsOk()" style="margin-bottom: 0">{{ jobsOk() }}</p>
              <p class="err" *ngIf="jobsErr()" style="margin-bottom: 0">{{ jobsErr() }}</p>
              <div class="subs-grid" *ngIf="jobs().length" style="margin-top: 0.65rem">
                <article class="subCard" *ngFor="let j of jobs(); trackBy: trackByJobId">
                  <div class="subCard__head">
                    <div class="subCard__left">
                      <div class="subCard__t">
                        <strong class="subCard__title">Job {{ j.id.slice(0, 8) }}</strong>
                        <span class="subCard__date">
                          {{ j.status }}
                          · {{ j.progress.processed }}/{{ j.progress.total }}
                          <ng-container *ngIf="j.progress.failed">
                            · failed {{ j.progress.failed }}</ng-container
                          >
                        </span>
                      </div>
                    </div>
                  </div>
                  <p class="muted" *ngIf="j.error" style="margin: 0">{{ j.error }}</p>
                  <div class="subCard__actions">
                    <button
                      class="btn"
                      type="button"
                      (click)="runEmbeddingsJob(j.id)"
                      [disabled]="jobsBusy()"
                    >
                      Run
                    </button>
                  </div>
                </article>
              </div>
              <p class="muted" *ngIf="!jobsBusy() && !jobsErr() && !jobs().length">
                Пока нет задач. Создать можно через API или будущий UI.
              </p>
            </div>
          </div>
        </section>

        <section class="account-block" id="account-public" aria-labelledby="account-public-title">
          <h2 class="account-block__title" id="account-public-title">
            {{ i18n.t('account.publicProfile.title') }}
          </h2>
          <p class="muted">{{ i18n.t('account.publicProfile.hint') }}</p>
          <div class="card">
            <div class="actions" style="margin-bottom: 0.65rem">
              <button class="btn" type="button" (click)="loadServerPublicProfile()">
                {{ i18n.t('account.publicProfile.load') }}
              </button>
              <button class="btn btn--primary" type="button" (click)="saveServerPublicProfile()">
                {{ i18n.t('account.publicProfile.save') }}
              </button>
              <a
                *ngIf="ppSlug.value.trim()"
                class="btn"
                [routerLink]="['/u', ppSlug.value.trim()]"
                >{{ i18n.t('account.publicProfile.preview') }}</a
              >
            </div>
            <label class="field">
              <span>slug</span>
              <input class="input" [formControl]="ppSlug" placeholder="my-handle" />
            </label>
            <label class="field chk">
              <input type="checkbox" [formControl]="ppEnabled" />
              <span>{{ i18n.t('account.publicProfile.enabled') }}</span>
            </label>
            <label class="field">
              <span>{{ i18n.t('account.publicProfile.visibility') }}</span>
              <select class="input" [formControl]="ppVisibility">
                <option value="private">private</option>
                <option value="unlisted">unlisted</option>
                <option value="public">public</option>
              </select>
            </label>
            <p class="muted" style="margin: 0 0 0.35rem">
              {{ i18n.t('account.publicProfile.sections') }}
            </p>
            <label class="field chk">
              <input type="checkbox" [formControl]="ppSecFavorites" />
              <span>favorites</span>
            </label>
            <label class="field chk">
              <input type="checkbox" [formControl]="ppSecDiary" />
              <span>diary</span>
            </label>
            <label class="field chk">
              <input type="checkbox" [formControl]="ppSecWatchlist" />
              <span>watchlist</span>
            </label>
            <p class="err" *ngIf="ppErr()">{{ ppErr() }}</p>
            <p class="ok" *ngIf="ppOk()">{{ ppOk() }}</p>
          </div>
        </section>

        <section class="account-block" id="account-subs" aria-labelledby="account-subs-title">
          <h2 class="account-block__title" id="account-subs-title">
            {{ i18n.t('account.section.subscriptions') }}
          </h2>
          <p class="muted" *ngIf="!subsSorted().length">{{ i18n.t('notifications.empty') }}</p>
          <div class="subs-grid" *ngIf="subsSorted().length">
            <article class="subCard" *ngFor="let s of subsSorted(); trackBy: trackBySubId">
              <div class="subCard__head">
                <div class="subCard__left">
                  <div class="thumb" [class.thumb--empty]="!s.posterPath">
                    <img
                      *ngIf="s.posterPath as sp"
                      [src]="posterUrl(sp)"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div class="subCard__t">
                    <strong class="subCard__title">{{ s.title }}</strong>
                    <span class="subCard__date">{{ s.releaseDate || '—' }}</span>
                  </div>
                </div>
              </div>
              <div class="subCard__meta">
                <app-badge *ngIf="s.channels.inApp">In-app</app-badge>
                <app-badge *ngIf="s.channels.webPush">Web Push</app-badge>
                <app-badge *ngIf="s.channels.email">Email</app-badge>
                <app-badge *ngIf="s.channels.calendar">Calendar</app-badge>
              </div>
              <div class="subCard__actions">
                <a class="btn" [routerLink]="['/movie', s.tmdbId]">{{
                  i18n.t('notifications.open')
                }}</a>
                <button class="btn" type="button" (click)="removeSub(s.id)">
                  {{ i18n.t('notifications.remove') }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </ng-container>

      <ng-template #authTpl>
        <div class="grid">
          <article class="card">
            <h2 class="cardTitle">{{ i18n.t('account.login') }}</h2>
            <label class="field">
              <span>{{ i18n.t('account.email') }}</span>
              <input class="input" [formControl]="loginEmail" autocomplete="email" />
            </label>
            <label class="field">
              <span>{{ i18n.t('account.password') }}</span>
              <input
                class="input"
                type="password"
                [formControl]="loginPassword"
                autocomplete="current-password"
              />
            </label>
            <p class="err" *ngIf="loginError()">{{ loginError() }}</p>
            <button class="btn btn--primary" type="button" (click)="doLogin()" [disabled]="busy()">
              {{ i18n.t('account.login') }}
            </button>
          </article>

          <article class="card">
            <h2 class="cardTitle">{{ i18n.t('account.register') }}</h2>
            <label class="field">
              <span>{{ i18n.t('account.email') }}</span>
              <input class="input" [formControl]="regEmail" autocomplete="email" />
            </label>
            <label class="field">
              <span>{{ i18n.t('account.password') }}</span>
              <input
                class="input"
                type="password"
                [formControl]="regPassword"
                autocomplete="new-password"
              />
            </label>
            <p class="hint">{{ i18n.t('account.passwordHint') }}</p>
            <p class="err" *ngIf="regError()">{{ regError() }}</p>
            <button
              class="btn btn--primary"
              type="button"
              (click)="doRegister()"
              [disabled]="busy()"
            >
              {{ i18n.t('account.register') }}
            </button>
          </article>
        </div>
      </ng-template>

      <section
        class="account-block"
        id="account-streaming"
        aria-labelledby="account-streaming-title"
      >
        <h2 class="account-block__title" id="account-streaming-title">Мои сервисы</h2>
        <p class="muted">
          Выберите регион и список стримингов — на странице фильма мы подсветим провайдеров “My”.
        </p>

        <div class="card">
          <label class="field">
            <span>Регион (ISO, напр. US, RU)</span>
            <input
              #regionInput
              class="input"
              [value]="myRegion()"
              (change)="setMyRegion(regionInput.value)"
            />
          </label>

          <div class="field">
            <span>Провайдеры (как в списке TMDB)</span>
            <div class="actions">
              <input class="input" [formControl]="providerName" placeholder="Netflix" />
              <button class="btn btn--primary" type="button" (click)="addProvider()">
                Добавить
              </button>
              <button class="btn" type="button" (click)="openCatalog()">Каталог</button>
            </div>
          </div>

          <div class="subCard__meta" *ngIf="myProviders().length">
            <app-badge *ngFor="let p of myProviders()">
              {{ p }}
              <button
                class="pill-x"
                type="button"
                (click)="removeProvider(p)"
                aria-label="Remove provider"
              >
                ✕
              </button>
            </app-badge>
          </div>
          <p class="muted" *ngIf="!myProviders().length">
            Пока пусто — добавьте хотя бы один сервис.
          </p>
        </div>
      </section>

      <app-bottom-sheet
        [open]="catalogOpen()"
        title="Каталог провайдеров"
        ariaLabel="Streaming providers catalog"
        (closed)="catalogOpen.set(false)"
      >
        <p class="muted">
          Поиск по каталогу TMDB для региона <strong>{{ myRegion() }}</strong
          >. Если сервер не настроен (TMDB key), можно добавить вручную.
        </p>

        <div class="actions">
          <input
            class="input"
            [formControl]="catalogQuery"
            placeholder="Поиск (например, Netflix)"
            aria-label="Provider search"
          />
          <button class="btn" type="button" (click)="reloadCatalog()">Обновить</button>
        </div>

        <p class="muted" *ngIf="catalogError()">{{ catalogError() }}</p>

        <div class="catalog" *ngIf="catalogVisible().length">
          <app-chip
            *ngFor="let p of catalogVisible(); trackBy: trackByProviderId"
            [selected]="isProviderSelected(p.name)"
            (clicked)="toggleProviderFromCatalog(p.name)"
          >
            {{ p.name }}
          </app-chip>
        </div>

        <p class="muted" *ngIf="!catalogError() && !catalogVisible().length">Ничего не найдено.</p>
      </app-bottom-sheet>

      <section class="account-block" id="account-favorites" aria-labelledby="account-fav-title">
        <h2 class="account-block__title" id="account-fav-title">
          {{ i18n.t('account.section.favorites') }}
        </h2>
        <p class="muted" *ngIf="!favorites().length">{{ i18n.t('home.favoritesEmptySubtitle') }}</p>
        <div class="fav-grid" *ngIf="favorites().length">
          <a
            class="fav-grid__item"
            *ngFor="let m of favorites(); trackBy: trackByMovieId"
            [routerLink]="['/movie', m.id]"
          >
            <app-movie-card [movie]="m" />
          </a>
        </div>
      </section>
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
        margin: 0 0 0.25rem;
      }
      .sub {
        margin: 0;
        color: var(--text-muted);
        max-width: 72ch;
        line-height: 1.5;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 0.8rem;
        justify-items: start;
        margin-bottom: 1.25rem;
      }
      .card {
        width: 100%;
        max-width: 420px;
        border-radius: 16px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.03);
        padding: 0.9rem;
      }
      .card--who {
        margin-bottom: 1rem;
      }
      .cardTitle {
        margin: 0 0 0.7rem;
        font-size: 1.05rem;
      }
      .field {
        display: grid;
        gap: 0.35rem;
        margin-bottom: 0.7rem;
      }
      .field span {
        font-size: 0.9rem;
        color: var(--text-muted);
      }
      .input {
        width: 100%;
        padding: 0.75rem 0.85rem;
        border-radius: 14px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
        color: var(--text);
        outline: none;
      }
      .input:focus {
        border-color: rgba(255, 195, 113, 0.45);
        box-shadow: 0 0 0 4px rgba(255, 195, 113, 0.12);
      }
      .hint {
        margin: -0.25rem 0 0.7rem;
        color: var(--text-muted);
        font-size: 0.88rem;
      }
      .err {
        margin: 0 0 0.7rem;
        color: var(--accent);
        font-size: 0.92rem;
        line-height: 1.4;
      }
      .ok {
        margin: 0 0 0.7rem;
        color: var(--accent-secondary, #86efac);
        font-size: 0.92rem;
      }
      .field.chk {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
      }
      .field.chk span {
        margin: 0;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-top: 0.9rem;
      }
      .catalog {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: 0.75rem;
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
        border-color: rgba(255, 195, 113, 0.45);
        background: rgba(255, 195, 113, 0.14);
      }
      .muted {
        margin: 0 0 0.65rem;
        color: var(--text-muted);
        line-height: 1.5;
      }

      .account-block {
        margin: 0 0 1.5rem;
      }
      .account-block__title {
        margin: 0 0 0.75rem;
        font-size: 1.12rem;
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      .subs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 0.8rem;
        justify-items: start;
      }
      .subCard {
        width: 100%;
        max-width: 420px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-muted) 35%, transparent);
        padding: 0.85rem;
        display: grid;
        gap: 0.65rem;
      }
      .subCard__head {
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        align-items: baseline;
        flex-wrap: wrap;
      }
      .subCard__left {
        display: flex;
        gap: 0.65rem;
        align-items: center;
      }
      .subCard__t {
        display: grid;
        gap: 0.15rem;
      }
      .subCard__title {
        line-height: 1.25;
      }
      .subCard__date {
        color: var(--text-muted);
        font-size: 0.9rem;
      }
      .subCard__meta {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
      }
      .pill-x {
        margin-left: 0.35rem;
        border: 0;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        font: inherit;
      }
      .pill-x:hover {
        color: var(--text);
      }
      .subCard__actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .thumb {
        width: 42px;
        height: 63px;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        overflow: hidden;
        background: rgba(255, 255, 255, 0.04);
        flex: 0 0 auto;
      }
      .thumb--empty {
        background: linear-gradient(145deg, rgba(255, 107, 107, 0.2), rgba(255, 195, 113, 0.12));
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .fav-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
        justify-items: start;
      }
      .fav-grid__item {
        width: 100%;
        max-width: 220px;
        text-decoration: none;
        color: inherit;
      }
      .fav-grid__item:hover {
        transform: translateY(-2px);
        transition: transform 0.18s ease;
      }
    `,
  ],
})
export class AccountPageComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly streamingPrefs = inject(StreamingPrefsService);
  private readonly streamingCatalog = inject(StreamingCatalogService);
  private readonly router = inject(Router);
  private readonly subsSvc = inject(ReleaseSubscriptionsService);
  private readonly fav = inject(FavoritesService);
  private readonly storage = inject(StorageService);
  private readonly exportsApi = inject(ExportsApiService);
  private readonly cinemaApi = inject(ServerCinemaApiService);
  readonly i18n = inject(I18nService);

  readonly user = this.auth.user;

  readonly loginEmail = new FormControl('', { nonNullable: true });
  readonly loginPassword = new FormControl('', { nonNullable: true });
  readonly regEmail = new FormControl('', { nonNullable: true });
  readonly regPassword = new FormControl('', { nonNullable: true });

  readonly serverJwt = new FormControl(this.storage.get<string>('server.jwt.token.v1', '') ?? '', {
    nonNullable: true,
  });
  readonly exportKind = new FormControl<ExportKind>('diary', { nonNullable: true });
  readonly exportFormat = new FormControl<ExportFormat>('csv', { nonNullable: true });
  readonly exportError = signal<string | null>(null);

  readonly emailDevBusy = signal(false);
  readonly emailDevOk = signal<string | null>(null);
  readonly emailDevErr = signal<string | null>(null);

  readonly featuresBusy = signal(false);
  readonly featuresOk = signal<string | null>(null);
  readonly featuresErr = signal<string | null>(null);
  readonly featuresErrors = signal<readonly { tmdbId: number; error: string }[]>([]);

  readonly featuresLimit = new FormControl<number>(30, { nonNullable: true });
  readonly featuresLanguage = new FormControl('', { nonNullable: true });

  readonly jobsBusy = signal(false);
  readonly jobsOk = signal<string | null>(null);
  readonly jobsErr = signal<string | null>(null);
  readonly jobs = signal<readonly EmbeddingsJobItem[]>([]);
  readonly embeddingsLimit = new FormControl<number>(50, { nonNullable: true });
  private jobsPollTimer: ReturnType<typeof setInterval> | null = null;
  private jobsPollEndsAt = 0;
  private readonly destroyRef = inject(DestroyRef);

  readonly ppSlug = new FormControl('', { nonNullable: true });
  readonly ppEnabled = new FormControl(false, { nonNullable: true });
  readonly ppVisibility = new FormControl<'private' | 'unlisted' | 'public'>('private', {
    nonNullable: true,
  });
  readonly ppSecFavorites = new FormControl(false, { nonNullable: true });
  readonly ppSecDiary = new FormControl(false, { nonNullable: true });
  readonly ppSecWatchlist = new FormControl(false, { nonNullable: true });
  readonly ppErr = signal<string | null>(null);
  readonly ppOk = signal<string | null>(null);

  private readonly _busy = signal(false);
  readonly busy = computed(() => this._busy());

  readonly loginError = signal<string | null>(null);
  readonly regError = signal<string | null>(null);

  readonly subsSorted = computed(() => sortSubscriptionsByRelease(this.subsSvc.mySubscriptions()));
  readonly favorites = computed(() => this.fav.favorites());

  loadServerPublicProfile(): void {
    this.ppErr.set(null);
    this.ppOk.set(null);
    const token = this.serverJwt.value.trim();
    if (!token) {
      this.ppErr.set(this.i18n.t('account.publicProfile.needJwt'));
      return;
    }
    this.storage.set('server.jwt.token.v1', token);
    this.cinemaApi.getMePublicProfile().subscribe({
      next: (p) => {
        if (!p) {
          this.ppErr.set(this.i18n.t('account.publicProfile.loadFailed'));
          return;
        }
        this.ppSlug.setValue(p.slug ?? '');
        this.ppEnabled.setValue(p.enabled);
        this.ppVisibility.setValue(p.visibility);
        this.ppSecFavorites.setValue(p.sections.favorites);
        this.ppSecDiary.setValue(p.sections.diary);
        this.ppSecWatchlist.setValue(p.sections.watchlist);
      },
    });
  }

  saveServerPublicProfile(): void {
    this.ppErr.set(null);
    this.ppOk.set(null);
    const token = this.serverJwt.value.trim();
    if (!token) {
      this.ppErr.set(this.i18n.t('account.publicProfile.needJwt'));
      return;
    }
    this.storage.set('server.jwt.token.v1', token);
    const slugRaw = this.ppSlug.value.trim().toLowerCase();
    const slug = slugRaw.length ? slugRaw : null;
    const body: MePublicProfile = {
      slug,
      enabled: this.ppEnabled.value,
      visibility: this.ppVisibility.value,
      sections: {
        favorites: this.ppSecFavorites.value,
        diary: this.ppSecDiary.value,
        watchlist: this.ppSecWatchlist.value,
      },
    };
    this.cinemaApi.putMePublicProfile(body).subscribe({
      next: (r) => {
        if (!r?.ok) {
          this.ppErr.set(this.i18n.t('account.publicProfile.saveFailed'));
          return;
        }
        this.ppOk.set(this.i18n.t('account.publicProfile.saved'));
      },
    });
  }

  downloadExport(): void {
    this.exportError.set(null);
    const token = this.serverJwt.value.trim();
    if (!token) {
      this.exportError.set('JWT token обязателен.');
      return;
    }
    this.storage.set('server.jwt.token.v1', token);

    this._busy.set(true);
    const kind = this.exportKind.value;
    const format = this.exportFormat.value;
    this.exportsApi.download(token, { kind, format }).subscribe({
      next: (blob) => {
        const ext = format === 'csv' ? 'csv' : 'json';
        const filename = `export_${kind}.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this._busy.set(false);
      },
      error: (e) => {
        this.exportError.set(e?.message ?? 'Export failed');
        this._busy.set(false);
      },
    });
  }

  sendDevTestEmail(): void {
    this.emailDevOk.set(null);
    this.emailDevErr.set(null);
    const token = this.serverJwt.value.trim();
    if (!token) {
      this.emailDevErr.set(this.i18n.t('account.publicProfile.needJwt'));
      return;
    }
    this.storage.set('server.jwt.token.v1', token);
    this.emailDevBusy.set(true);
    this.cinemaApi.devEmailSendTest().subscribe({
      next: (r) => {
        this.emailDevBusy.set(false);
        if (!r) {
          this.emailDevErr.set(this.i18n.t('account.emailDev.failed'));
          return;
        }
        if (r.ok) {
          this.emailDevOk.set(this.i18n.t('account.emailDev.ok'));
          return;
        }
        const err = r.error ?? '—';
        this.emailDevErr.set(this.i18n.t('account.emailDev.apiError').replace('{{error}}', err));
      },
      error: () => {
        this.emailDevBusy.set(false);
        this.emailDevErr.set(this.i18n.t('account.emailDev.failed'));
      },
    });
  }

  refreshMyMovieFeatures(): void {
    this.featuresOk.set(null);
    this.featuresErr.set(null);
    this.featuresErrors.set([]);
    const token = this.serverJwt.value.trim();
    if (!token) {
      this.featuresErr.set(this.i18n.t('account.publicProfile.needJwt'));
      return;
    }
    this.storage.set('server.jwt.token.v1', token);
    this.featuresBusy.set(true);
    const limit = this.featuresLimit.value;
    const language = this.featuresLanguage.value.trim();
    this.cinemaApi.refreshMyMovieFeatures({ limit, language }).subscribe({
      next: (r) => {
        this.featuresBusy.set(false);
        if (!r) {
          this.featuresErr.set('Request failed');
          return;
        }
        const okN = r.items.length;
        const errN = r.errors.length;
        if (errN) {
          this.featuresErrors.set(r.errors);
          this.featuresErr.set(`Done with errors: ok=${okN}, errors=${errN}`);
          return;
        }
        this.featuresOk.set(`Done: refreshed ${okN}`);
      },
      error: () => {
        this.featuresBusy.set(false);
        this.featuresErr.set('Request failed');
      },
    });
  }

  private startJobsPolling(): void {
    const now = Date.now();
    this.jobsPollEndsAt = now + 45_000;
    if (this.jobsPollTimer) return;

    this.jobsPollTimer = setInterval(() => {
      if (Date.now() > this.jobsPollEndsAt) {
        this.stopJobsPolling();
        return;
      }
      const hasRunning = this.jobs().some((j) => j.status === 'queued' || j.status === 'running');
      if (!hasRunning) {
        this.stopJobsPolling();
        return;
      }
      this.loadEmbeddingsJobs({ silent: true });
    }, 2000);

    this.destroyRef.onDestroy(() => this.stopJobsPolling());
  }

  private stopJobsPolling(): void {
    if (!this.jobsPollTimer) return;
    clearInterval(this.jobsPollTimer);
    this.jobsPollTimer = null;
  }

  loadEmbeddingsJobs(opts?: { silent?: boolean }): void {
    if (!opts?.silent) {
      this.jobsErr.set(null);
    }
    const token = this.serverJwt.value.trim();
    if (!token) {
      if (!opts?.silent) {
        this.jobsErr.set(this.i18n.t('account.publicProfile.needJwt'));
      }
      return;
    }
    this.storage.set('server.jwt.token.v1', token);
    if (!opts?.silent) {
      this.jobsBusy.set(true);
    }
    this.cinemaApi.listEmbeddingsJobs({ limit: 20, offset: 0 }).subscribe({
      next: (r) => {
        if (!opts?.silent) {
          this.jobsBusy.set(false);
        }
        if (!r?.ok) {
          if (!opts?.silent) {
            this.jobsErr.set('Request failed');
            this.jobs.set([]);
          }
          return;
        }
        this.jobs.set(r.items ?? []);
        this.startJobsPolling();
      },
      error: () => {
        if (!opts?.silent) {
          this.jobsBusy.set(false);
          this.jobsErr.set('Request failed');
          this.jobs.set([]);
        }
      },
    });
  }

  runEmbeddingsJob(id: string): void {
    this.jobsErr.set(null);
    const token = this.serverJwt.value.trim();
    if (!token) {
      this.jobsErr.set(this.i18n.t('account.publicProfile.needJwt'));
      return;
    }
    this.storage.set('server.jwt.token.v1', token);
    this.jobsBusy.set(true);
    this.cinemaApi.runEmbeddingsJob(id).subscribe({
      next: () => {
        this.jobsBusy.set(false);
        this.loadEmbeddingsJobs();
      },
      error: () => {
        this.jobsBusy.set(false);
        this.jobsErr.set('Request failed');
      },
    });
  }

  createAndRunMyEmbeddingsJob(): void {
    this.jobsOk.set(null);
    this.jobsErr.set(null);
    const token = this.serverJwt.value.trim();
    if (!token) {
      this.jobsErr.set(this.i18n.t('account.publicProfile.needJwt'));
      return;
    }
    this.storage.set('server.jwt.token.v1', token);
    this.jobsBusy.set(true);
    const limit = this.embeddingsLimit.value;
    this.cinemaApi.createMyEmbeddingsJob({ limit }).subscribe({
      next: (r) => {
        if (!r?.ok) {
          this.jobsBusy.set(false);
          this.jobsErr.set('Request failed');
          return;
        }
        this.jobsOk.set(`Created job ${r.id.slice(0, 8)} with ${r.tmdbIds.length} tmdbId(s)`);
        this.cinemaApi.runEmbeddingsJob(r.id).subscribe({
          next: () => {
            this.jobsBusy.set(false);
            this.loadEmbeddingsJobs();
          },
          error: () => {
            this.jobsBusy.set(false);
            this.jobsErr.set('Request failed');
          },
        });
      },
      error: () => {
        this.jobsBusy.set(false);
        this.jobsErr.set('Request failed');
      },
    });
  }

  posterUrl(path: string): string {
    return tmdbImg(92, path);
  }

  trackBySubId(_: number, s: { id: string }): string {
    return s.id;
  }

  trackByMovieId(_: number, m: { id: number }): number {
    return m.id;
  }

  trackByJobId(_: number, j: { id: string }): string {
    return j.id;
  }

  removeSub(id: string): void {
    try {
      this.subsSvc.remove(id);
    } catch {
      /* ignore */
    }
  }

  readonly myRegion = computed(() => this.streamingPrefs.region());
  readonly myProviders = computed(() => this.streamingPrefs.providers());
  readonly providerName = new FormControl('', { nonNullable: true });

  readonly catalogOpen = signal(false);
  readonly catalogQuery = new FormControl('', { nonNullable: true });
  readonly catalogItems = signal<readonly { id: number; name: string }[]>([]);
  readonly catalogError = signal<string | null>(null);

  readonly catalogVisible = computed(() => {
    const q = this.catalogQuery.value.trim().toLowerCase();
    const items = this.catalogItems();
    if (!q) return items.slice(0, 40);
    return items.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 40);
  });

  setMyRegion(v: string): void {
    this.streamingPrefs.setRegion(v);
  }

  openCatalog(): void {
    this.catalogOpen.set(true);
    if (this.catalogItems().length) return;
    this.reloadCatalog();
  }

  reloadCatalog(): void {
    this.catalogError.set(null);
    this.streamingCatalog.listProviders(this.myRegion()).subscribe({
      next: (items) => {
        this.catalogItems.set(items.map((p) => ({ id: p.id, name: p.name })));
      },
      error: () => {
        this.catalogError.set('Каталог недоступен. Проверьте настройки сервера (TMDB key).');
        this.catalogItems.set([]);
      },
    });
  }

  addProvider(): void {
    const v = this.providerName.value.trim();
    if (!v) return;
    this.streamingPrefs.addProvider(v);
    this.providerName.setValue('');
  }

  isProviderSelected(name: string): boolean {
    const n = name.trim().toLowerCase();
    return this.myProviders()
      .map((p) => p.trim().toLowerCase())
      .some((p) => p === n);
  }

  toggleProviderFromCatalog(name: string): void {
    if (this.isProviderSelected(name)) {
      this.removeProvider(name);
      return;
    }
    this.streamingPrefs.addProvider(name);
  }

  removeProvider(name: string): void {
    this.streamingPrefs.removeProvider(name);
  }

  trackByProviderId(_: number, p: { id: number; name: string }): number {
    return p.id;
  }

  async doLogin(): Promise<void> {
    this.loginError.set(null);
    this._busy.set(true);
    try {
      await this.auth.login(this.loginEmail.value, this.loginPassword.value);
      await this.navigateAfterAuth();
    } catch (e) {
      this.loginError.set(e instanceof Error ? e.message : 'Не удалось войти.');
    } finally {
      this._busy.set(false);
    }
  }

  async doRegister(): Promise<void> {
    this.regError.set(null);
    this._busy.set(true);
    try {
      await this.auth.register(this.regEmail.value, this.regPassword.value);
      await this.navigateAfterAuth();
    } catch (e) {
      this.regError.set(e instanceof Error ? e.message : 'Не удалось зарегистрироваться.');
    } finally {
      this._busy.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }

  private async navigateAfterAuth(): Promise<void> {
    const qp = this.route.snapshot.queryParamMap;
    const returnUrl = (qp.get('returnUrl') ?? '/').trim();
    const safeReturnUrl = returnUrl.startsWith('/') ? returnUrl : '/';
    await this.router.navigateByUrl(safeReturnUrl);
  }
}
