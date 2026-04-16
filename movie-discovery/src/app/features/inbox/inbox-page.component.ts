import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { StorageService } from '@core/storage.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { SegmentedControlComponent } from '@shared/ui/segmented-control/segmented-control.component';
import { ChipComponent } from '@shared/ui/chip/chip.component';
import { ServerConnectComponent } from '@shared/ui/server-connect/server-connect.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { PageIntroComponent } from '@shared/ui/page-intro/page-intro.component';
import type { AlertRule, InboxExplain, InboxItem } from './inbox.model';
import { InboxService } from './inbox.service';
import { inboxExplainFromRuleClauses } from './rule-clause.util';
import {
  AlertsApiService,
  type ServerAlertRuleItem,
  type ServerNotificationItem,
} from './alerts-api.service';
import {
  ServerCinemaApiService,
  type ServerReleaseReminderItem,
} from '@core/server-cinema-api.service';
import { ServerSessionService } from '@core/server-session.service';
import { firstValueFrom, forkJoin } from 'rxjs';
import { MovieService } from '@features/movies/data-access/services/movie.service';
import type { Movie } from '@features/movies/data-access/models/movie.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@features/auth/auth.service';
import { ReleaseSubscriptionsService } from '@features/notifications/release-subscriptions.service';
import { sortSubscriptionsByRelease } from '@core/release-list.util';
import { InboxTab, normalizeInboxTab } from './inbox-tab.util';

@Component({
  selector: 'app-inbox-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    EmptyStateComponent,
    SectionComponent,
    SegmentedControlComponent,
    CardComponent,
    ButtonComponent,
    BottomSheetComponent,
    FormFieldComponent,
    ChipComponent,
    ServerConnectComponent,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <app-page-intro
        [title]="i18n.t('nav.inbox')"
        [purpose]="i18n.t('inbox.purpose')"
        [instruction]="i18n.t('inbox.instruction')"
      />

      <app-section [title]="i18n.t('nav.inbox')">
        <div sectionActions>
          <app-segmented
            [ariaLabel]="i18n.t('inbox.tabs.aria')"
            [options]="tabOptions()"
            [value]="tab()"
            (select)="setTab($event)"
          />
          <app-button variant="secondary" (click)="svc.addSample()">{{
            i18n.t('inbox.actions.addSample')
          }}</app-button>
          <app-button variant="ghost" (click)="svc.markAllRead()">{{
            i18n.t('inbox.actions.markAllRead')
          }}</app-button>
          <app-button variant="secondary" (click)="openRuleCreate()">{{
            i18n.t('inbox.actions.newRule')
          }}</app-button>
        </div>

        <app-server-connect
          [label]="i18n.t('inbox.serverConnect.label')"
          [hint]="i18n.t('inbox.serverConnect.hint')"
        />
        <div class="actions" style="margin-top: 0.5rem">
          <app-button
            variant="secondary"
            [loading]="serverBusy()"
            [disabled]="serverBusy() || !cinemaApi.hasToken()"
            (click)="loadServerFeed()"
            data-testid="inbox-load-server-feed"
          >
            {{ i18n.t('inbox.serverActions.loadFeed') }}
          </app-button>
          <app-button
            variant="ghost"
            [loading]="serverBusy()"
            [disabled]="serverBusy() || !cinemaApi.hasToken()"
            (click)="runDevAlerts()"
            data-testid="inbox-dev-run-alerts"
          >
            {{ i18n.t('inbox.serverActions.runAlerts') }}
          </app-button>
          <app-button
            variant="ghost"
            [loading]="serverBusy()"
            [disabled]="serverBusy() || !cinemaApi.hasToken()"
            (click)="seedServerRule()"
            data-testid="inbox-seed-server-rule"
          >
            {{ i18n.t('inbox.serverActions.seedRule') }}
          </app-button>
        </div>
        @if (serverErr(); as se) {
          <p class="muted" role="alert" style="margin-top: 0.65rem">{{ se }}</p>
          <div class="actions" style="margin-top: 0.5rem">
            <app-button
              variant="secondary"
              [loading]="serverBusy()"
              [disabled]="serverBusy() || !cinemaApi.hasToken()"
              (click)="retryServerFeed()"
            >
              {{ i18n.t('common.retry') }}
            </app-button>
          </div>
        }

        <app-empty-state
          *ngIf="
            tab() === 'feed' && !items().length && !serverRows().length && !reminderRows().length
          "
          [title]="i18n.t('inbox.empty.feed.title')"
          [subtitle]="i18n.t('inbox.empty.feed.subtitle')"
        >
          <app-button variant="secondary" (click)="svc.addSample()">{{
            i18n.t('inbox.actions.addSample')
          }}</app-button>
          <app-button variant="ghost" routerLink="/account/inbox" [queryParams]="{ tab: 'subs' }">{{
            i18n.t('inbox.actions.releaseSubscriptions')
          }}</app-button>
        </app-empty-state>

        <div class="list" *ngIf="tab() === 'feed' && reminderRows().length">
          <p class="muted" style="margin: 0 0 0.5rem">
            {{ i18n.t('inbox.serverReminders.title') }}
          </p>
          <app-card
            *ngFor="let it of reminderRows(); trackBy: trackByReminderId"
            [title]="'TMDB ' + it.tmdbId + ' · ' + it.reminderType"
            class="inbox-server-row"
          >
            <p class="muted">
              {{ it.window.daysBefore }}d before · inApp={{ it.channels['inApp'] ? 'on' : 'off' }}
            </p>
            <p class="muted">
              <small>{{ it.createdAt }}</small>
            </p>
            <div class="actions">
              <app-button variant="ghost" [routerLink]="['/movie', it.tmdbId]">{{
                i18n.t('common.open')
              }}</app-button>
            </div>
          </app-card>
        </div>

        <div class="list" *ngIf="tab() === 'feed' && serverRows().length">
          <p class="muted" style="margin: 0 0 0.5rem">{{ i18n.t('inbox.serverFeed.title') }}</p>
          <app-card
            *ngFor="let it of serverRows(); trackBy: trackByServerId"
            [title]="it.title"
            class="inbox-server-row"
          >
            @if (it.body) {
              <p class="muted">{{ it.body }}</p>
            }
            <p class="muted">
              <small>{{ it.createdAt }}</small>
            </p>
            <div class="actions">
              <app-button
                variant="secondary"
                [disabled]="serverBusy() || !!it.readAt"
                (click)="markServerRead(it)"
              >
                {{ i18n.t('inbox.actions.read') }}
              </app-button>
              @if (it.ruleId) {
                <app-button
                  variant="ghost"
                  [disabled]="serverBusy() || !cinemaApi.hasToken()"
                  (click)="downloadRuleCalendar(it.ruleId)"
                >
                  {{ i18n.t('inbox.actions.downloadCalendar') }}
                </app-button>
              }
              @if (it.tmdbId != null) {
                <app-button variant="ghost" [routerLink]="['/movie', it.tmdbId]">{{
                  i18n.t('inbox.actions.openMovie')
                }}</app-button>
              }
            </div>
          </app-card>
        </div>

        <div class="list" *ngIf="tab() === 'feed' && items().length">
          <app-card *ngFor="let it of items(); trackBy: trackById" [title]="it.title">
            @if (it.body) {
              <p class="muted">{{ it.body }}</p>
            }
            @if (it.explain?.length) {
              <details class="why">
                <summary class="why__sum">{{ i18n.t('inbox.why.title') }}</summary>
                <ul class="why__list">
                  <li *ngFor="let e of it.explain">
                    <b>{{ e.label }}</b>
                    @if (e.detail) {
                      <span> — {{ e.detail }}</span>
                    }
                  </li>
                </ul>
              </details>
            }

            <div class="actions">
              <app-button variant="secondary" (click)="svc.markRead(it.id)">{{
                i18n.t('inbox.actions.read')
              }}</app-button>
              <app-button variant="ghost" (click)="svc.remove(it.id)">{{
                i18n.t('inbox.actions.remove')
              }}</app-button>
              @if (it.tmdbId != null) {
                <app-button variant="ghost" [routerLink]="['/movie', it.tmdbId]">{{
                  i18n.t('inbox.actions.openMovie')
                }}</app-button>
              }
            </div>
          </app-card>
        </div>

        <app-empty-state
          *ngIf="tab() === 'rules' && !rules().length"
          [title]="i18n.t('inbox.empty.rules.title')"
          [subtitle]="i18n.t('inbox.empty.rules.subtitle')"
        >
          <app-button variant="secondary" (click)="openRuleCreate()">{{
            i18n.t('inbox.actions.newRule')
          }}</app-button>
        </app-empty-state>

        <div class="list" *ngIf="tab() === 'rules' && rules().length">
          <app-card *ngFor="let r of rules(); trackBy: trackByRuleId" [title]="r.name">
            <p class="muted">
              {{ r.enabled ? i18n.t('inbox.rule.enabled') : i18n.t('inbox.rule.disabled') }}
              · inApp={{ r.channels.inApp ? i18n.t('inbox.rule.on') : i18n.t('inbox.rule.off') }} ·
              webPush={{
                r.channels.webPush ? i18n.t('inbox.rule.on') : i18n.t('inbox.rule.off')
              }}
              · email={{ r.channels.email ? i18n.t('inbox.rule.on') : i18n.t('inbox.rule.off') }} ·
              calendar={{
                r.channels.calendar ? i18n.t('inbox.rule.on') : i18n.t('inbox.rule.off')
              }}
            </p>
            <p class="muted">
              {{ i18n.t('inbox.rule.filters') }} minRating={{ r.filters.minRating ?? '—' }},
              maxRuntime={{ r.filters.maxRuntime ?? '—' }}
            </p>
            <details class="why">
              <summary class="why__sum">{{ i18n.t('inbox.rule.whyClauses') }}</summary>
              <ul class="why__list">
                <li *ngFor="let e of explainForRule(r)">
                  <b>{{ e.label }}</b>
                  @if (e.detail) {
                    <span> — {{ e.detail }}</span>
                  }
                </li>
              </ul>
            </details>
            <div class="actions">
              <app-button variant="secondary" (click)="openRuleEdit(r)">{{
                i18n.t('inbox.actions.edit')
              }}</app-button>
              <app-button variant="danger" (click)="svc.removeRule(r.id)">{{
                i18n.t('inbox.actions.delete')
              }}</app-button>
            </div>
          </app-card>
        </div>

        <div class="list" *ngIf="tab() === 'rules' && cinemaApi.hasToken() && serverRules().length">
          <p class="muted" style="margin: 0 0 0.5rem">{{ i18n.t('inbox.serverRules.title') }}</p>
          <app-card
            *ngFor="let r of serverRules(); trackBy: trackByServerRuleId"
            [title]="r.name"
            class="inbox-server-row"
          >
            <p class="muted">
              {{ r.enabled ? i18n.t('inbox.rule.enabled') : i18n.t('inbox.rule.disabled') }}
              · inApp={{ r.channels.inApp ? i18n.t('inbox.rule.on') : i18n.t('inbox.rule.off') }} ·
              webPush={{
                r.channels.webPush ? i18n.t('inbox.rule.on') : i18n.t('inbox.rule.off')
              }}
              · email={{ r.channels.email ? i18n.t('inbox.rule.on') : i18n.t('inbox.rule.off') }} ·
              calendar={{
                r.channels.calendar ? i18n.t('inbox.rule.on') : i18n.t('inbox.rule.off')
              }}
            </p>
            <div class="actions">
              @if (r.channels.calendar) {
                <app-button
                  variant="secondary"
                  [disabled]="serverBusy()"
                  (click)="downloadRuleCalendar(r.id)"
                >
                  {{ i18n.t('inbox.actions.downloadCalendar') }}
                </app-button>
              }
            </div>
          </app-card>
        </div>

        <app-empty-state
          *ngIf="tab() === 'subs' && !isAuthed()"
          [title]="i18n.t('account.login')"
          [subtitle]="i18n.t('home.loginForSubs')"
        />

        <app-empty-state
          *ngIf="tab() === 'subs' && isAuthed() && !subsSorted().length"
          [title]="i18n.t('inbox.subs.title')"
          [subtitle]="i18n.t('notifications.empty')"
        />

        <div class="list" *ngIf="tab() === 'subs' && isAuthed() && subsSorted().length">
          <app-card *ngFor="let s of subsSorted(); trackBy: trackBySubId" [title]="s.title">
            <p class="muted">{{ s.releaseDate || '—' }}</p>
            <div class="actions">
              <app-button variant="secondary" [routerLink]="['/movie', s.tmdbId]">{{
                i18n.t('notifications.open')
              }}</app-button>
              <app-button variant="danger" (click)="removeSub(s.id)">{{
                i18n.t('notifications.remove')
              }}</app-button>
            </div>
          </app-card>
        </div>
      </app-section>

      <app-bottom-sheet
        [open]="ruleSheetOpen()"
        [title]="editingRule() ? i18n.t('inbox.sheet.editRule') : i18n.t('inbox.sheet.newRule')"
        [ariaLabel]="i18n.t('inbox.sheet.aria')"
        (closed)="closeRuleSheet()"
      >
        <form class="form" (submit)="saveRule($event)">
          <app-form-field [label]="i18n.t('inbox.form.name')">
            <input [(ngModel)]="draftName" name="name" required />
          </app-form-field>
          <app-form-field [label]="i18n.t('inbox.form.enabled')">
            <select [(ngModel)]="draftEnabled" name="enabled">
              <option [ngValue]="true">{{ i18n.t('inbox.rule.enabled') }}</option>
              <option [ngValue]="false">{{ i18n.t('inbox.rule.disabled') }}</option>
            </select>
          </app-form-field>
          <app-form-field [label]="i18n.t('inbox.form.minRating')">
            <input
              [(ngModel)]="draftMinRating"
              name="minRating"
              type="number"
              min="0"
              max="10"
              step="0.5"
            />
          </app-form-field>

          <app-form-field
            [label]="i18n.t('inbox.form.genres')"
            [hint]="i18n.t('inbox.form.genresHint')"
          >
            <div class="chipsRow">
              <input
                [(ngModel)]="draftGenreId"
                name="genreId"
                type="number"
                min="1"
                step="1"
                placeholder="28"
              />
              <app-button variant="secondary" type="button" (click)="addGenre()">{{
                i18n.t('inbox.actions.add')
              }}</app-button>
            </div>
            <div class="chips" *ngIf="draftGenres().length">
              <app-chip
                *ngFor="let g of draftGenres(); trackBy: trackByNum"
                [selected]="true"
                (clicked)="removeGenre(g)"
              >
                {{ g }}
              </app-chip>
            </div>
          </app-form-field>
          <app-form-field [label]="i18n.t('inbox.form.maxRuntime')">
            <input
              [(ngModel)]="draftMaxRuntime"
              name="maxRuntime"
              type="number"
              min="1"
              max="500"
              step="5"
            />
          </app-form-field>

          <app-form-field
            [label]="i18n.t('inbox.form.languages')"
            [hint]="i18n.t('inbox.form.languagesHint')"
          >
            <div class="chipsRow">
              <input [(ngModel)]="draftLang" name="lang" placeholder="en" />
              <app-button variant="secondary" type="button" (click)="addLang()">{{
                i18n.t('inbox.actions.add')
              }}</app-button>
            </div>
            <div class="chips" *ngIf="draftLangs().length">
              <app-chip
                *ngFor="let l of draftLangs(); trackBy: trackByText"
                [selected]="true"
                (clicked)="removeLang(l)"
              >
                {{ l }}
              </app-chip>
            </div>
          </app-form-field>

          <app-form-field
            [label]="i18n.t('inbox.form.providerKeys')"
            [hint]="i18n.t('inbox.form.providerKeysHint')"
          >
            <div class="chipsRow">
              <input [(ngModel)]="draftProviderKey" name="providerKey" placeholder="netflix" />
              <app-button variant="secondary" type="button" (click)="addProviderKey()">{{
                i18n.t('inbox.actions.add')
              }}</app-button>
            </div>
            <div class="chips" *ngIf="draftProviderKeys().length">
              <app-chip
                *ngFor="let p of draftProviderKeys(); trackBy: trackByText"
                [selected]="true"
                (clicked)="removeProviderKey(p)"
              >
                {{ p }}
              </app-chip>
            </div>
          </app-form-field>
          <app-form-field [label]="i18n.t('inbox.form.channels')">
            <div class="row">
              <label class="check"
                ><input type="checkbox" [(ngModel)]="chInApp" name="chInApp" /> In-app</label
              >
              <label class="check"
                ><input type="checkbox" [(ngModel)]="chWebPush" name="chWebPush" /> WebPush</label
              >
              <label class="check"
                ><input type="checkbox" [(ngModel)]="chEmail" name="chEmail" /> Email</label
              >
              <label class="check"
                ><input type="checkbox" [(ngModel)]="chCal" name="chCal" /> Calendar</label
              >
            </div>
          </app-form-field>

          <div class="whyPreview">
            <p class="muted whyPreview__ttl">{{ i18n.t('inbox.form.whyPreview') }}</p>
            <ul class="whyPreview__list">
              <li *ngFor="let e of whyPreviewLines(); trackBy: trackExplain">
                <b>{{ e.label }}</b>
                <span *ngIf="e.detail"> — {{ e.detail }}</span>
              </li>
            </ul>
          </div>

          <div class="preview">
            <p class="muted" *ngIf="previewText()">{{ previewText() }}</p>
            <app-button
              variant="ghost"
              type="button"
              [loading]="previewLoading()"
              (click)="runPreview()"
            >
              {{ i18n.t('inbox.actions.preview') }}
            </app-button>
          </div>

          <div class="formActions">
            <app-button variant="ghost" type="button" (click)="closeRuleSheet()">{{
              i18n.t('common.cancel')
            }}</app-button>
            <app-button type="submit">{{ i18n.t('common.save') }}</app-button>
          </div>
        </form>
      </app-bottom-sheet>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
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
      .list {
        display: grid;
        gap: 0.75rem;
      }
      .muted {
        margin: 0 0 0.65rem;
        color: var(--text-muted);
        line-height: 1.45;
        max-width: 72ch;
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }
      .why {
        margin: 0 0 0.75rem;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 0.55rem 0.65rem;
        background: color-mix(in srgb, var(--bg-elevated) 45%, transparent);
      }
      .why__sum {
        cursor: pointer;
        color: var(--text);
        font-weight: 600;
      }
      .why__list {
        margin: 0.6rem 0 0;
        padding-left: 1.1rem;
        color: var(--text-muted);
        line-height: 1.5;
      }
      .form {
        display: grid;
        gap: 0.75rem;
      }
      .chipsRow {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .chipsRow input {
        min-width: 140px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: 0.55rem;
      }
      .row {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .check {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--text-muted);
        font-size: 0.92rem;
      }
      .formActions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        justify-content: flex-end;
        margin-top: 0.25rem;
      }
      .whyPreview {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 0.55rem 0.65rem;
        background: color-mix(in srgb, var(--bg-elevated) 40%, transparent);
      }
      .whyPreview__ttl {
        margin: 0 0 0.45rem;
        font-weight: 600;
        color: var(--text-muted);
        font-size: 0.88rem;
      }
      .whyPreview__list {
        margin: 0;
        padding-left: 1.1rem;
        color: var(--text-muted);
        line-height: 1.5;
        font-size: 0.88rem;
      }
      .preview {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 0.6rem 0.7rem;
        background: color-mix(in srgb, var(--bg-elevated) 45%, transparent);
      }
    `,
  ],
})
export class InboxPageComponent {
  readonly i18n = inject(I18nService);
  readonly toast = inject(ToastService);
  readonly svc = inject(InboxService);
  private readonly movies = inject(MovieService);
  private readonly storage = inject(StorageService);
  private readonly alertsApi = inject(AlertsApiService);
  readonly cinemaApi = inject(ServerCinemaApiService);
  readonly serverSession = inject(ServerSessionService);
  private readonly auth = inject(AuthService);
  private readonly subsSvc = inject(ReleaseSubscriptionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _serverRows = signal<ServerNotificationItem[]>([]);
  readonly serverRows = this._serverRows.asReadonly();
  private readonly _serverRules = signal<ServerAlertRuleItem[]>([]);
  readonly serverRules = this._serverRules.asReadonly();
  private readonly _reminderRows = signal<ServerReleaseReminderItem[]>([]);
  readonly reminderRows = this._reminderRows.asReadonly();
  private readonly _serverBusy = signal(false);
  readonly serverBusy = this._serverBusy.asReadonly();
  private readonly _serverErr = signal<string | null>(null);
  readonly serverErr = this._serverErr.asReadonly();

  readonly tab = signal<InboxTab>('feed');
  readonly tabOptions = computed(() => [
    { value: 'feed' as const, label: this.i18n.t('inbox.tabs.feed') },
    { value: 'rules' as const, label: this.i18n.t('inbox.tabs.rules') },
    { value: 'subs' as const, label: this.i18n.t('inbox.tabs.subs') },
  ]);

  readonly items = computed(() => this.svc.itemsSorted());
  readonly rules = computed(() => this.svc.rulesSorted());

  readonly isAuthed = computed(() => this.auth.isAuthenticated());
  readonly subsSorted = computed(() => sortSubscriptionsByRelease(this.subsSvc.mySubscriptions()));

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.tab.set(normalizeInboxTab(params.get('tab')));
    });
  }

  setTab(tab: InboxTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'feed' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

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

  retryServerFeed(): void {
    this.loadServerFeed();
  }

  loadServerFeed(): void {
    const t = this.cinemaApi.getToken();
    if (!t) return;
    this._serverErr.set(null);
    this._serverBusy.set(true);
    forkJoin({
      notifications: this.alertsApi.listNotifications(t),
      rules: this.alertsApi.listRules(t),
      reminders: this.cinemaApi.listReleaseReminders(),
    }).subscribe({
      next: ({ notifications, rules, reminders }) => {
        this._serverRows.set(notifications.items);
        this._serverRules.set(rules ?? []);
        this._reminderRows.set(reminders?.items ?? []);
        this._serverBusy.set(false);
      },
      error: (e) => this.handleServerErr(e),
    });
  }

  runDevAlerts(): void {
    const t = this.cinemaApi.getToken();
    if (!t) return;
    this._serverErr.set(null);
    this._serverBusy.set(true);
    this.alertsApi.runDevAlerts(t).subscribe({
      next: (r) => {
        if (!r.ok) {
          this._serverErr.set(r.error ?? 'Dev alerts disabled on server');
          this._serverBusy.set(false);
          return;
        }
        this.loadServerFeed();
      },
      error: (e) => this.handleServerErr(e),
    });
  }

  seedServerRule(): void {
    const t = this.cinemaApi.getToken();
    if (!t) return;
    this._serverErr.set(null);
    this._serverBusy.set(true);
    this.alertsApi
      .upsertRule(t, {
        name: 'Inbox seed rule',
        enabled: true,
        filters: {},
        channels: {
          inApp: true,
          webPush: false,
          email: false,
          calendar: false,
        },
        quietHours: null,
      })
      .subscribe({
        next: () => {
          this._serverBusy.set(false);
          this.toast.show('success', 'Rule', 'Saved on server');
        },
        error: (e) => this.handleServerErr(e),
      });
  }

  markServerRead(it: ServerNotificationItem): void {
    const t = this.cinemaApi.getToken();
    if (!t) return;
    this._serverErr.set(null);
    this._serverBusy.set(true);
    this.alertsApi.markRead(t, it.id).subscribe({
      next: () => this.loadServerFeed(),
      error: (e) => this.handleServerErr(e),
    });
  }

  async downloadRuleCalendar(ruleId: string): Promise<void> {
    const t = this.cinemaApi.getToken();
    if (!t) return;
    this._serverErr.set(null);
    this._serverBusy.set(true);
    try {
      const blob = await firstValueFrom(this.alertsApi.downloadRuleCalendarIcs(t, ruleId, 100));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alert-rule-${ruleId}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.handleServerErr(e);
      return;
    } finally {
      this._serverBusy.set(false);
    }
  }

  trackByServerId(_: number, it: ServerNotificationItem): string {
    return it.id;
  }

  trackByServerRuleId(_: number, it: ServerAlertRuleItem): string {
    return it.id;
  }

  trackByReminderId(_: number, it: ServerReleaseReminderItem): string {
    return it.id;
  }

  private handleServerErr(e: unknown): void {
    const msg =
      e instanceof HttpErrorResponse
        ? `${e.status} ${e.statusText}${e.error?.message ? `: ${e.error.message}` : ''}`
        : 'Request failed';
    this._serverErr.set(msg);
    this._serverBusy.set(false);
  }

  readonly ruleSheetOpen = signal(false);
  readonly editingRule = signal<AlertRule | null>(null);

  draftName = '';
  draftEnabled = true;
  draftMinRating = '';
  draftMaxRuntime = '';
  draftGenreId = '';
  readonly draftGenres = signal<number[]>([]);
  draftLang = '';
  readonly draftLangs = signal<string[]>([]);
  draftProviderKey = '';
  readonly draftProviderKeys = signal<string[]>([]);
  chInApp = true;
  chWebPush = false;
  chEmail = false;
  chCal = false;
  readonly previewLoading = signal(false);
  readonly previewText = signal<string>('');

  openRuleCreate(): void {
    this.editingRule.set(null);
    this.draftName = '';
    this.draftEnabled = true;
    this.draftMinRating = '';
    this.draftMaxRuntime = '';
    this.draftGenreId = '';
    this.draftGenres.set([]);
    this.draftLang = '';
    this.draftLangs.set([]);
    this.draftProviderKey = '';
    this.draftProviderKeys.set([]);
    this.chInApp = true;
    this.chWebPush = false;
    this.chEmail = false;
    this.chCal = false;
    this.previewText.set('');
    this.ruleSheetOpen.set(true);
  }

  openRuleEdit(r: AlertRule): void {
    this.editingRule.set(r);
    this.draftName = r.name;
    this.draftEnabled = r.enabled;
    this.draftMinRating = r.filters.minRating != null ? String(r.filters.minRating) : '';
    this.draftMaxRuntime = r.filters.maxRuntime != null ? String(r.filters.maxRuntime) : '';
    this.draftGenreId = '';
    this.draftGenres.set([...(r.filters.genres ?? [])]);
    this.draftLang = '';
    this.draftLangs.set([...(r.filters.languages ?? [])]);
    this.draftProviderKey = '';
    this.draftProviderKeys.set([...(r.filters.providerKeys ?? [])]);
    this.chInApp = r.channels.inApp;
    this.chWebPush = r.channels.webPush;
    this.chEmail = r.channels.email;
    this.chCal = r.channels.calendar;
    this.previewText.set('');
    this.ruleSheetOpen.set(true);
  }

  closeRuleSheet(): void {
    this.ruleSheetOpen.set(false);
  }

  saveRule(ev: Event): void {
    ev.preventDefault();
    try {
      const minRating = this.draftMinRating.trim() ? Number(this.draftMinRating) : null;
      const maxRuntime = this.draftMaxRuntime.trim() ? Number(this.draftMaxRuntime) : null;
      const r = this.svc.upsertRule({
        id: this.editingRule()?.id,
        name: this.draftName,
        enabled: this.draftEnabled,
        filters: {
          minRating: Number.isFinite(minRating as number) ? minRating : null,
          genres: this.draftGenres().length ? this.draftGenres() : null,
          maxRuntime: Number.isFinite(maxRuntime as number) ? maxRuntime : null,
          languages: this.draftLangs().length ? this.draftLangs() : null,
          providerKeys: this.draftProviderKeys().length ? this.draftProviderKeys() : null,
        },
        channels: {
          inApp: this.chInApp,
          webPush: this.chWebPush,
          email: this.chEmail,
          calendar: this.chCal,
        },
      });
      this.toast.show('success', 'Saved', r.name);
      this.ruleSheetOpen.set(false);
    } catch {
      this.toast.show('error', 'Error', 'Could not save rule');
    }
  }

  trackById(_: number, it: InboxItem): string {
    return it.id;
  }

  trackByRuleId(_: number, r: AlertRule): string {
    return r.id;
  }

  trackByText(_: number, s: string): string {
    return s;
  }

  trackByNum(_: number, n: number): number {
    return n;
  }

  trackExplain(_: number, e: InboxExplain): string {
    return `${e.label}\u0000${e.detail ?? ''}`;
  }

  whyPreviewLines(): InboxExplain[] {
    const name = this.draftName.trim() || 'Untitled rule';
    const minRating = this.draftMinRating.trim() ? Number(this.draftMinRating) : null;
    const maxRuntime = this.draftMaxRuntime.trim() ? Number(this.draftMaxRuntime) : null;
    return inboxExplainFromRuleClauses(
      name,
      {
        minRating: Number.isFinite(minRating as number) ? minRating : null,
        genres: this.draftGenres().length ? this.draftGenres() : null,
        maxRuntime: Number.isFinite(maxRuntime as number) ? maxRuntime : null,
        languages: this.draftLangs().length ? this.draftLangs() : null,
        providerKeys: this.draftProviderKeys().length ? this.draftProviderKeys() : null,
      },
      {
        inApp: this.chInApp,
        webPush: this.chWebPush,
        email: this.chEmail,
        calendar: this.chCal,
      },
    );
  }

  explainForRule(r: AlertRule): InboxExplain[] {
    return inboxExplainFromRuleClauses(r.name, r.filters, r.channels);
  }

  addGenre(): void {
    const v = this.draftGenreId.trim();
    if (!v) return;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;
    const cur = this.draftGenres();
    if (cur.includes(n)) return;
    this.draftGenres.set([...cur, n].sort((a, b) => a - b));
    this.draftGenreId = '';
  }

  removeGenre(id: number): void {
    this.draftGenres.set(this.draftGenres().filter((x) => x !== id));
  }

  addLang(): void {
    const v = this.draftLang.trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(v)) return;
    const cur = this.draftLangs();
    if (cur.includes(v)) return;
    this.draftLangs.set([...cur, v].sort());
    this.draftLang = '';
  }

  removeLang(v: string): void {
    this.draftLangs.set(this.draftLangs().filter((x) => x !== v));
  }

  addProviderKey(): void {
    const v = this.draftProviderKey.trim().toLowerCase();
    if (!v) return;
    const cur = this.draftProviderKeys();
    if (cur.includes(v)) return;
    this.draftProviderKeys.set([...cur, v].sort());
    this.draftProviderKey = '';
  }

  removeProviderKey(v: string): void {
    this.draftProviderKeys.set(this.draftProviderKeys().filter((x) => x !== v));
  }

  async runPreview(): Promise<void> {
    if (this.previewLoading()) return;
    this.previewLoading.set(true);
    this.previewText.set('');
    try {
      const samplePages = [1, 2];
      const sample: Movie[] = [];
      for (const p of samplePages) {
        const res = await firstValueFrom(this.movies.getPopularMovies(p));
        sample.push(...(res?.results ?? []));
      }

      const minRating = this.draftMinRating.trim() ? Number(this.draftMinRating) : null;
      const genres = this.draftGenres();
      const langs = this.draftLangs();

      const matches = sample.filter((m) => {
        if (minRating != null && Number.isFinite(minRating) && (m.vote_average ?? 0) < minRating)
          return false;
        if (langs.length) {
          const ol = (m.original_language ?? '').toLowerCase();
          if (!ol || !langs.includes(ol)) return false;
        }
        if (genres.length) {
          const g = m.genre_ids ?? [];
          if (!g.some((id) => genres.includes(id))) return false;
        }
        return true;
      });

      const ratio = sample.length ? matches.length / sample.length : 0;
      const estPerWeek = Math.round(ratio * 140); // heuristic, “order of magnitude”
      this.previewText.set(
        `Preview: ${matches.length}/${sample.length} matches in popular sample → примерно ${estPerWeek}/нед (грубо).`,
      );
    } catch {
      this.toast.show('error', 'Preview failed', 'TMDB sample could not be loaded');
    } finally {
      this.previewLoading.set(false);
    }
  }
}
