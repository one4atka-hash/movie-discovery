import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from './auth.service';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">← {{ i18n.t('nav.home') }}</a>

      <header class="head">
        <h1 class="title">{{ i18n.t('account.title') }}</h1>
        <p class="sub">{{ i18n.t('account.subtitle') }}</p>
      </header>

      <div class="who" *ngIf="user() as u; else authTpl">
        <div class="card">
          <p class="muted">{{ i18n.t('account.loggedInAs') }}</p>
          <strong>{{ u.email }}</strong>
          <div class="actions">
            <a class="btn btn--primary" routerLink="/notifications">{{ i18n.t('account.myNotifications') }}</a>
            <button class="btn" type="button" (click)="logout()">{{ i18n.t('account.logout') }}</button>
          </div>
        </div>
      </div>

      <ng-template #authTpl>
        <div class="grid">
          <article class="card">
            <h2 class="cardTitle">{{ i18n.t('account.login') }}</h2>
            <label class="field">
              <span>{{ i18n.t('account.email') }}</span>
              <input class="input" [formControl]="loginEmail" autocomplete="email">
            </label>
            <label class="field">
              <span>{{ i18n.t('account.password') }}</span>
              <input class="input" type="password" [formControl]="loginPassword" autocomplete="current-password">
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
              <input class="input" [formControl]="regEmail" autocomplete="email">
            </label>
            <label class="field">
              <span>{{ i18n.t('account.password') }}</span>
              <input class="input" type="password" [formControl]="regPassword" autocomplete="new-password">
            </label>
            <p class="hint">{{ i18n.t('account.passwordHint') }}</p>
            <p class="err" *ngIf="regError()">{{ regError() }}</p>
            <button class="btn btn--primary" type="button" (click)="doRegister()" [disabled]="busy()">
              {{ i18n.t('account.register') }}
            </button>
          </article>
        </div>
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
      }
      .card {
        border-radius: 16px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.03);
        padding: 0.9rem;
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
        color: #ffc371;
        font-size: 0.92rem;
        line-height: 1.4;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-top: 0.9rem;
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
      .muted {
        margin: 0 0 0.2rem;
        color: var(--text-muted);
      }
    `
  ]
})
export class AccountPageComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
    const returnUrl = (qp.get('returnUrl') ?? '/notifications').trim();
    const tmdbId = qp.get('tmdbId');
    const safeReturnUrl = returnUrl.startsWith('/') ? returnUrl : '/notifications';

    if (safeReturnUrl === '/notifications' && tmdbId && Number.isFinite(Number(tmdbId))) {
      await this.router.navigate(['/notifications'], { queryParams: { tmdbId: Number(tmdbId) } });
      return;
    }

    await this.router.navigateByUrl(safeReturnUrl);
  }
}

