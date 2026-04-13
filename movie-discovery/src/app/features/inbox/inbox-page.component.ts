import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { SegmentedControlComponent } from '@shared/ui/segmented-control/segmented-control.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import type { AlertRule, InboxItem } from './inbox.model';
import { InboxService } from './inbox.service';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="head">
        <h1 class="title">{{ i18n.t('nav.inbox') }}</h1>
        <p class="sub">
          Умные уведомления: релизы, доступность на моих сервисах, “уходит скоро”, digest и
          “почему”.
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

        <app-empty-state
          *ngIf="tab() === 'feed' && !items().length"
          title="Нет событий"
          subtitle="Итерация 5.2: Inbox + Rules. Пока это локальный MVP. Добавьте sample или создайте rule."
        >
          <app-button variant="secondary" (click)="svc.addSample()">Add sample</app-button>
          <app-button variant="ghost" routerLink="/notifications">Релиз‑уведомления</app-button>
        </app-empty-state>

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
    `,
  ],
})
export class InboxPageComponent {
  readonly i18n = inject(I18nService);
  readonly toast = inject(ToastService);
  readonly svc = inject(InboxService);

  readonly tab = signal<'feed' | 'rules'>('feed');
  readonly tabOptions = [
    { value: 'feed' as const, label: 'Feed' },
    { value: 'rules' as const, label: 'Rules' },
  ];

  readonly items = computed(() => this.svc.itemsSorted());
  readonly rules = computed(() => this.svc.rulesSorted());

  readonly ruleSheetOpen = signal(false);
  readonly editingRule = signal<AlertRule | null>(null);

  draftName = '';
  draftEnabled = true;
  draftMinRating = '';
  draftMaxRuntime = '';
  chInApp = true;
  chWebPush = false;
  chEmail = false;
  chCal = false;

  openRuleCreate(): void {
    this.editingRule.set(null);
    this.draftName = '';
    this.draftEnabled = true;
    this.draftMinRating = '';
    this.draftMaxRuntime = '';
    this.chInApp = true;
    this.chWebPush = false;
    this.chEmail = false;
    this.chCal = false;
    this.ruleSheetOpen.set(true);
  }

  openRuleEdit(r: AlertRule): void {
    this.editingRule.set(r);
    this.draftName = r.name;
    this.draftEnabled = r.enabled;
    this.draftMinRating = r.filters.minRating != null ? String(r.filters.minRating) : '';
    this.draftMaxRuntime = r.filters.maxRuntime != null ? String(r.filters.maxRuntime) : '';
    this.chInApp = r.channels.inApp;
    this.chWebPush = r.channels.webPush;
    this.chEmail = r.channels.email;
    this.chCal = r.channels.calendar;
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
          maxRuntime: Number.isFinite(maxRuntime as number) ? maxRuntime : null,
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
}
