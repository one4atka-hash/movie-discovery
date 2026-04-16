import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-account-shell-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="accountShellHead">
        <h1 class="accountShellTitle">{{ i18n.t('nav.account') }}</h1>
        <p class="accountShellHint">{{ i18n.t('account.subtitle') }}</p>
      </div>

      <nav class="tabs" [attr.aria-label]="i18n.t('nav.account')">
        <a class="tab" routerLink="/account/today" routerLinkActive="is-active">{{
          i18n.t('nav.tonight')
        }}</a>
        <a class="tab" routerLink="/account/diary" routerLinkActive="is-active">{{
          i18n.t('nav.diary')
        }}</a>
        <a class="tab" routerLink="/account/lists" routerLinkActive="is-active">{{
          i18n.t('nav.lists')
        }}</a>
        <a class="tab" routerLink="/account/inbox" routerLinkActive="is-active">{{
          i18n.t('nav.inbox')
        }}</a>
        <a class="tab" routerLink="/account/settings" routerLinkActive="is-active">{{
          i18n.t('account.title')
        }}</a>
      </nav>

      <router-outlet />
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
      }
      .accountShellHead {
        margin-bottom: 0.75rem;
      }
      .accountShellTitle {
        margin: 0 0 0.25rem;
        font-size: 1.35rem;
        letter-spacing: -0.02em;
      }
      .accountShellHint {
        margin: 0;
        color: var(--text-muted);
        line-height: 1.5;
        max-width: 72ch;
      }

      .tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.85rem 0 1rem;
      }
      .tab {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem 0.85rem;
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text);
        text-decoration: none;
        transition:
          transform 0.15s ease,
          background 0.15s ease,
          border-color 0.15s ease;
      }
      .tab:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.14);
      }
      .tab.is-active {
        border-color: rgba(255, 195, 113, 0.45);
        background: rgba(255, 195, 113, 0.12);
      }
    `,
  ],
})
export class AccountShellPageComponent {
  readonly i18n = inject(I18nService);
}
