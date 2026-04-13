import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  readonly i18n = inject(I18nService);

  readonly user = this.auth.user;

  readonly loginEmail = new FormControl('', { nonNullable: true });
  readonly loginPassword = new FormControl('', { nonNullable: true });
  readonly regEmail = new FormControl('', { nonNullable: true });
  readonly regPassword = new FormControl('', { nonNullable: true });

  private readonly _busy = signal(false);
  readonly busy = computed(() => this._busy());

  readonly loginError = signal<string | null>(null);
  readonly regError = signal<string | null>(null);

  readonly subsSorted = computed(() => sortSubscriptionsByRelease(this.subsSvc.mySubscriptions()));
  readonly favorites = computed(() => this.fav.favorites());

  posterUrl(path: string): string {
    return tmdbImg(92, path);
  }

  trackBySubId(_: number, s: { id: string }): string {
    return s.id;
  }

  trackByMovieId(_: number, m: { id: number }): number {
    return m.id;
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
