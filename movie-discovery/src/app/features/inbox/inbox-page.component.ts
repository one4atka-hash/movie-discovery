import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import type { AlertRule, InboxExplain, InboxItem } from './inbox.model';
import { InboxService } from './inbox.service';
import { inboxExplainFromRuleClauses } from './rule-clause.util';
import { AlertsApiService, type ServerNotificationItem } from './alerts-api.service';
import {
  ServerCinemaApiService,
  type ServerReleaseReminderItem,
} from '@core/server-cinema-api.service';
import { firstValueFrom, forkJoin } from 'rxjs';
import { MovieService } from '@features/movies/data-access/services/movie.service';
import type { Movie } from '@features/movies/data-access/models/movie.model';

const SERVER_JWT_KEY = 'server.jwt.token.v1';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="head">
        <h1 class="title">{{ i18n.t('nav.inbox') }}</h1>
        <p class="sub">Purpose: получать полезные уведомления и управлять правилами.</p>
        <p class="sub">
          Как пользоваться: открой Feed → отметь прочитанное; на вкладке Rules создай правило.
        </p>
      </header>

      <app-section title="Inbox">
        <div sectionActions>
          <app-segmented
            ariaLabel="Inbox tab"
            [options]="tabOptions"
            [value]="tab()"
            (select)="tab.set($event)"
          />
          <app-button variant="secondary" (click)="svc.addSample()">Add sample</app-button>
          <app-button variant="ghost" (click)="svc.markAllRead()">Mark all read</app-button>
          <app-button variant="secondary" (click)="openRuleCreate()">New rule</app-button>
        </div>

        <app-card>
          <app-form-field
            label="Server JWT (optional)"
            hint="Для ленты с backend: тот же токен, что в Account / Import. Сохраняется локально."
          >
            <textarea
              [(ngModel)]="serverToken"
              rows="2"
              placeholder="eyJhbGciOi..."
              data-testid="inbox-server-jwt"
            ></textarea>
          </app-form-field>
          <div class="actions" style="margin-top: 0.5rem">
            <app-button
              variant="secondary"
              [loading]="serverBusy()"
              [disabled]="serverBusy() || !serverToken.trim()"
              (click)="loadServerFeed()"
              data-testid="inbox-load-server-feed"
            >
              Load server feed
            </app-button>
            <app-button
              variant="ghost"
              [loading]="serverBusy()"
              [disabled]="serverBusy() || !serverToken.trim()"
              (click)="runDevAlerts()"
              data-testid="inbox-dev-run-alerts"
            >
              Dev: run alerts
            </app-button>
            <app-button
              variant="ghost"
              [loading]="serverBusy()"
              [disabled]="serverBusy() || !serverToken.trim()"
              (click)="seedServerRule()"
              data-testid="inbox-seed-server-rule"
            >
              Seed server rule
            </app-button>
          </div>
          @if (serverErr(); as se) {
            <p class="muted" role="alert" style="margin-top: 0.65rem">{{ se }}</p>
            <div class="actions" style="margin-top: 0.5rem">
              <app-button
                variant="secondary"
                [loading]="serverBusy()"
                [disabled]="serverBusy() || !serverToken.trim()"
                (click)="retryServerFeed()"
              >
                {{ i18n.t('common.retry') }}
              </app-button>
            </div>
          }
        </app-card>

        <app-empty-state
          *ngIf="
            tab() === 'feed' && !items().length && !serverRows().length && !reminderRows().length
          "
          title="Нет событий"
          subtitle="Итерация 5.2: Inbox + Rules. Пока это локальный MVP. Добавьте sample или создайте rule."
        >
          <app-button variant="secondary" (click)="svc.addSample()">Add sample</app-button>
          <app-button variant="ghost" routerLink="/notifications">Релиз‑уведомления</app-button>
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
              <app-button variant="ghost" [routerLink]="['/movie', it.tmdbId]"
                >Open movie</app-button
              >
            </div>
          </app-card>
        </div>

        <div class="list" *ngIf="tab() === 'feed' && serverRows().length">
          <p class="muted" style="margin: 0 0 0.5rem">Server inbox</p>
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
                Read
              </app-button>
              @if (it.tmdbId != null) {
                <app-button variant="ghost" [routerLink]="['/movie', it.tmdbId]"
                  >Open movie</app-button
                >
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
                <summary class="why__sum">Why this?</summary>
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
              <app-button variant="secondary" (click)="svc.markRead(it.id)">Read</app-button>
              <app-button variant="ghost" (click)="svc.remove(it.id)">Remove</app-button>
              @if (it.tmdbId != null) {
                <app-button variant="ghost" [routerLink]="['/movie', it.tmdbId]"
                  >Open movie</app-button
                >
              }
            </div>
          </app-card>
        </div>

        <app-empty-state
          *ngIf="tab() === 'rules' && !rules().length"
          title="Rules пусты"
          subtitle="Создайте правило: пока MVP с базовыми фильтрами и каналами доставки."
        >
          <app-button variant="secondary" (click)="openRuleCreate()">New rule</app-button>
        </app-empty-state>

        <div class="list" *ngIf="tab() === 'rules' && rules().length">
          <app-card *ngFor="let r of rules(); trackBy: trackByRuleId" [title]="r.name">
            <p class="muted">
              {{ r.enabled ? 'Enabled' : 'Disabled' }} · inApp={{
                r.channels.inApp ? 'on' : 'off'
              }}
              · webPush={{ r.channels.webPush ? 'on' : 'off' }} · email={{
                r.channels.email ? 'on' : 'off'
              }}
              · calendar={{ r.channels.calendar ? 'on' : 'off' }}
            </p>
            <p class="muted">
              Filters: minRating={{ r.filters.minRating ?? '—' }}, maxRuntime={{
                r.filters.maxRuntime ?? '—'
              }}
            </p>
            <details class="why">
              <summary class="why__sum">Why (clauses)</summary>
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
              <app-button variant="secondary" (click)="openRuleEdit(r)">Edit</app-button>
              <app-button variant="danger" (click)="svc.removeRule(r.id)">Delete</app-button>
            </div>
          </app-card>
        </div>
      </app-section>

      <app-bottom-sheet
        [open]="ruleSheetOpen()"
        [title]="editingRule() ? 'Edit rule' : 'New rule'"
        ariaLabel="Rule editor"
        (closed)="closeRuleSheet()"
      >
        <form class="form" (submit)="saveRule($event)">
          <app-form-field label="Name">
            <input [(ngModel)]="draftName" name="name" required />
          </app-form-field>
          <app-form-field label="Enabled">
            <select [(ngModel)]="draftEnabled" name="enabled">
              <option [ngValue]="true">Enabled</option>
              <option [ngValue]="false">Disabled</option>
            </select>
          </app-form-field>
          <app-form-field label="Filters: min rating">
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
            label="Filters: genres (TMDB genre ids)"
            hint="Пример: 28 (Action), 35 (Comedy)"
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
              <app-button variant="secondary" type="button" (click)="addGenre()">Add</app-button>
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
          <app-form-field label="Filters: max runtime (min)">
            <input
              [(ngModel)]="draftMaxRuntime"
              name="maxRuntime"
              type="number"
              min="1"
              max="500"
              step="5"
            />
          </app-form-field>

          <app-form-field label="Filters: languages" hint="ISO 639-1, напр. en, ru">
            <div class="chipsRow">
              <input [(ngModel)]="draftLang" name="lang" placeholder="en" />
              <app-button variant="secondary" type="button" (click)="addLang()">Add</app-button>
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
            label="Filters: provider keys"
            hint="MVP: free-form (используем позже на backend)"
          >
            <div class="chipsRow">
              <input [(ngModel)]="draftProviderKey" name="providerKey" placeholder="netflix" />
              <app-button variant="secondary" type="button" (click)="addProviderKey()"
                >Add</app-button
              >
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
          <app-form-field label="Channels">
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
            <p class="muted whyPreview__ttl">Why (from clauses)</p>
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
              Preview
            </app-button>
          </div>

          <div class="formActions">
            <app-button variant="ghost" type="button" (click)="closeRuleSheet()">Cancel</app-button>
            <app-button type="submit">Save</app-button>
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
  private readonly cinemaApi = inject(ServerCinemaApiService);

  serverToken = this.storage.get<string>(SERVER_JWT_KEY, '') ?? '';
  private readonly _serverRows = signal<ServerNotificationItem[]>([]);
  readonly serverRows = this._serverRows.asReadonly();
  private readonly _reminderRows = signal<ServerReleaseReminderItem[]>([]);
  readonly reminderRows = this._reminderRows.asReadonly();
  private readonly _serverBusy = signal(false);
  readonly serverBusy = this._serverBusy.asReadonly();
  private readonly _serverErr = signal<string | null>(null);
  readonly serverErr = this._serverErr.asReadonly();

  readonly tab = signal<'feed' | 'rules'>('feed');
  readonly tabOptions = [
    { value: 'feed' as const, label: 'Feed' },
    { value: 'rules' as const, label: 'Rules' },
  ];

  readonly items = computed(() => this.svc.itemsSorted());
  readonly rules = computed(() => this.svc.rulesSorted());

  retryServerFeed(): void {
    this.loadServerFeed();
  }

  loadServerFeed(): void {
    const t = this.serverToken.trim();
    if (!t) return;
    this.storage.set(SERVER_JWT_KEY, t);
    this._serverErr.set(null);
    this._serverBusy.set(true);
    forkJoin({
      notifications: this.alertsApi.listNotifications(t),
      reminders: this.cinemaApi.listReleaseReminders(),
    }).subscribe({
      next: ({ notifications, reminders }) => {
        this._serverRows.set(notifications.items);
        this._reminderRows.set(reminders?.items ?? []);
        this._serverBusy.set(false);
      },
      error: (e) => this.handleServerErr(e),
    });
  }

  runDevAlerts(): void {
    const t = this.serverToken.trim();
    if (!t) return;
    this.storage.set(SERVER_JWT_KEY, t);
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
    const t = this.serverToken.trim();
    if (!t) return;
    this.storage.set(SERVER_JWT_KEY, t);
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
    const t = this.serverToken.trim();
    if (!t) return;
    this._serverErr.set(null);
    this._serverBusy.set(true);
    this.alertsApi.markRead(t, it.id).subscribe({
      next: () => this.loadServerFeed(),
      error: (e) => this.handleServerErr(e),
    });
  }

  trackByServerId(_: number, it: ServerNotificationItem): string {
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
