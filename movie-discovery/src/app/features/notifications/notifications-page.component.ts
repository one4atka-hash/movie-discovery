import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '@features/auth/auth.service';
import { ReleaseSubscriptionsService } from '@features/notifications/release-subscriptions.service';
import { sortSubscriptionsByRelease } from '@core/release-list.util';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">← {{ i18n.t('nav.home') }}</a>

      <header class="head">
        <h1 class="title">{{ i18n.t('nav.notifications') }}</h1>
        <p class="sub">{{ i18n.t('notifications.title') }}</p>
      </header>

      <app-empty-state
        *ngIf="!isAuthed()"
        [title]="i18n.t('account.login')"
        [subtitle]="i18n.t('home.loginForSubs')"
      />

      <app-empty-state
        *ngIf="isAuthed() && !subsSorted().length"
        [title]="i18n.t('notifications.title')"
        [subtitle]="i18n.t('notifications.empty')"
      />

      <div class="grid" *ngIf="isAuthed() && subsSorted().length">
        <article class="card" *ngFor="let s of subsSorted(); trackBy: trackBySubId">
          <div class="row">
            <div class="meta">
              <strong class="name">{{ s.title }}</strong>
              <span class="date">{{ s.releaseDate || '—' }}</span>
            </div>
            <div class="actions">
              <a class="btn" [routerLink]="['/movie', s.tmdbId]">{{
                i18n.t('notifications.open')
              }}</a>
              <button class="btn" type="button" (click)="removeSub(s.id)">
                {{ i18n.t('notifications.remove') }}
              </button>
            </div>
          </div>
        </article>
      </div>
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
      }
      .grid {
        display: grid;
        gap: 0.7rem;
      }
      .card {
        border-radius: 16px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.03);
        padding: 0.9rem;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        justify-content: space-between;
      }
      .meta {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }
      .name {
        font-size: 1rem;
      }
      .date {
        color: var(--text-muted);
        font-size: 0.9rem;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      .btn {
        border-radius: 9999px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
        padding: 0.45rem 0.8rem;
        cursor: pointer;
        font: inherit;
        text-decoration: none;
      }
      .btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `,
  ],
})
export class NotificationsPageComponent {
  readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly subsSvc = inject(ReleaseSubscriptionsService);

  readonly isAuthed = computed(() => this.auth.isAuthenticated());
  readonly subsSorted = computed(() => sortSubscriptionsByRelease(this.subsSvc.mySubscriptions()));

  trackBySubId(_: number, s: { id: string }): string {
    return s.id;
  }

  removeSub(id: string): void {
    try {
      this.subsSvc.remove(id);
    } catch {
      /* ignore */
    }
  }
}
