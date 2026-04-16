import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { ChipComponent } from '@shared/ui/chip/chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { PageIntroComponent } from '@shared/ui/page-intro/page-intro.component';
import type { DiaryEntry, DiaryLocation } from './diary.model';
import { DiaryService } from './diary.service';

@Component({
  selector: 'app-diary-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    EmptyStateComponent,
    SectionComponent,
    CardComponent,
    ButtonComponent,
    BottomSheetComponent,
    FormFieldComponent,
    ChipComponent,
    BadgeComponent,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <app-page-intro
        [title]="i18n.t('nav.diary')"
        [purpose]="i18n.t('diary.purpose')"
        [instruction]="i18n.t('diary.instruction')"
      />

      <app-section [title]="i18n.t('diary.section.entries')">
        <div sectionActions>
          <app-button (click)="openCreate()">{{ i18n.t('diary.actions.addEntry') }}</app-button>
        </div>

        <div class="stats" *ngIf="stats() as s">
          <app-badge variant="muted">{{ i18n.t('diary.stats.total') }}: {{ s.total }}</app-badge>
          @if (s.avgRating != null) {
            <app-badge variant="accent">★ {{ s.avgRating }}</app-badge>
          }
          @if (s.topTags.length) {
            <app-badge>{{ i18n.t('diary.stats.tags') }}: {{ s.topTags.join(', ') }}</app-badge>
          }
          @if (s.topLocations.length) {
            <app-badge variant="muted"
              >{{ i18n.t('diary.stats.where') }}: {{ s.topLocations.join(' · ') }}</app-badge
            >
          }
        </div>

        <app-empty-state
          *ngIf="!entries().length"
          [title]="i18n.t('diary.empty.title')"
          [subtitle]="i18n.t('diary.empty.subtitle')"
        >
          <app-button variant="secondary" (click)="openCreate()">{{
            i18n.t('diary.actions.addEntry')
          }}</app-button>
          <app-button variant="ghost" routerLink="/">{{
            i18n.t('diary.actions.findMovie')
          }}</app-button>
        </app-empty-state>

        <div class="list" *ngIf="entries().length">
          <app-card *ngFor="let e of entries(); trackBy: trackById" [title]="e.title">
            <div class="meta">
              <app-badge variant="muted">{{ e.watchedAt }}</app-badge>
              <app-badge>{{ locationLabel(e.location) }}</app-badge>
              @if (e.rating != null) {
                <app-badge variant="accent">★ {{ e.rating }}</app-badge>
              }
            </div>

            @if (e.tags?.length) {
              <div class="tags">
                <span class="tag" *ngFor="let t of e.tags; trackBy: trackByTag">#{{ t }}</span>
              </div>
            }

            @if (e.note) {
              <p class="note">{{ e.note }}</p>
            }

            <div class="actions">
              <app-button variant="secondary" (click)="openEdit(e)">{{
                i18n.t('diary.actions.edit')
              }}</app-button>
              <app-button variant="danger" (click)="remove(e)">{{
                i18n.t('diary.actions.delete')
              }}</app-button>
            </div>
          </app-card>
        </div>
      </app-section>

      <app-bottom-sheet
        [open]="sheetOpen()"
        [title]="editing() ? i18n.t('diary.sheet.editTitle') : i18n.t('diary.sheet.newTitle')"
        [ariaLabel]="i18n.t('diary.sheet.aria')"
        data-testid="diary-sheet"
        (closed)="closeSheet()"
      >
        <form class="form" (submit)="save($event)">
          <app-form-field [label]="i18n.t('diary.field.title')">
            <input [(ngModel)]="draftTitle" name="title" required data-testid="diary-title-input" />
          </app-form-field>

          <app-form-field
            [label]="i18n.t('diary.field.watchedAt')"
            [hint]="i18n.t('diary.field.watchedAtHint')"
          >
            <input [(ngModel)]="draftWatchedAt" name="watchedAt" type="date" required />
          </app-form-field>

          <app-form-field [label]="i18n.t('diary.field.location')">
            <div class="chips">
              <app-chip
                [selected]="draftLocation() === 'cinema'"
                (clicked)="draftLocation.set('cinema')"
              >
                {{ i18n.t('diary.location.cinema') }}
              </app-chip>
              <app-chip
                [selected]="draftLocation() === 'streaming'"
                (clicked)="draftLocation.set('streaming')"
              >
                {{ i18n.t('diary.location.streaming') }}
              </app-chip>
              <app-chip
                [selected]="draftLocation() === 'home'"
                (clicked)="draftLocation.set('home')"
              >
                {{ i18n.t('diary.location.home') }}
              </app-chip>
            </div>
          </app-form-field>

          <app-form-field [label]="i18n.t('diary.field.rating')">
            <input
              [(ngModel)]="draftRating"
              name="rating"
              type="number"
              min="0"
              max="10"
              step="0.5"
            />
          </app-form-field>

          <app-form-field
            [label]="i18n.t('diary.field.tags')"
            [hint]="i18n.t('diary.field.tagsHint')"
          >
            <input [(ngModel)]="draftTags" name="tags" />
          </app-form-field>

          <app-form-field [label]="i18n.t('diary.field.note')">
            <textarea [(ngModel)]="draftNote" name="note" rows="3"></textarea>
          </app-form-field>

          <div class="formActions">
            <app-button variant="ghost" type="button" (click)="closeSheet()">{{
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
      .meta {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-bottom: 0.65rem;
      }
      .stats {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }
      .tags {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
        margin-bottom: 0.65rem;
      }
      .tag {
        color: var(--text-faint);
        font-size: 0.82rem;
      }
      .note {
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

      .form {
        display: grid;
        gap: 0.75rem;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
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
export class DiaryPageComponent {
  readonly i18n = inject(I18nService);
  readonly toast = inject(ToastService);
  private readonly diary = inject(DiaryService);
  private readonly route = inject(ActivatedRoute);

  readonly sheetOpen = signal(false);
  readonly editing = signal<DiaryEntry | null>(null);

  readonly entries = computed(() => this.diary.sorted());
  readonly stats = computed(() => computeStats(this.entries()));

  draftTitle = '';
  draftWatchedAt = new Date().toISOString().slice(0, 10);
  readonly draftLocation = signal<DiaryLocation>('home');
  draftRating: string = '';
  draftTags = '';
  draftNote = '';
  /** Prefill from query `logTmdbId` when opening sheet from movie actions. */
  draftTmdbId: number | null = null;

  constructor() {
    const title = this.route.snapshot.queryParamMap.get('logTitle')?.trim();
    if (!title) return;
    const idRaw = this.route.snapshot.queryParamMap.get('logTmdbId');
    const id = idRaw ? Number(idRaw) : NaN;
    this.draftTmdbId = Number.isFinite(id) && id > 0 ? id : null;
    this.editing.set(null);
    this.draftTitle = title;
    this.draftWatchedAt = new Date().toISOString().slice(0, 10);
    this.draftLocation.set('home');
    this.draftRating = '';
    this.draftTags = '';
    this.draftNote = '';
    this.sheetOpen.set(true);
  }

  openCreate(): void {
    this.editing.set(null);
    this.draftTitle = '';
    this.draftWatchedAt = new Date().toISOString().slice(0, 10);
    this.draftLocation.set('home');
    this.draftRating = '';
    this.draftTags = '';
    this.draftNote = '';
    this.draftTmdbId = null;
    this.sheetOpen.set(true);
  }

  openEdit(e: DiaryEntry): void {
    this.editing.set(e);
    this.draftTitle = e.title;
    this.draftWatchedAt = e.watchedAt;
    this.draftLocation.set(e.location);
    this.draftRating = e.rating != null ? String(e.rating) : '';
    this.draftTags = (e.tags ?? []).join(', ');
    this.draftNote = e.note ?? '';
    this.draftTmdbId = e.tmdbId ?? null;
    this.sheetOpen.set(true);
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
  }

  save(ev: Event): void {
    ev.preventDefault();
    try {
      const tags = this.draftTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const rating = this.draftRating.trim() ? Number(this.draftRating) : null;
      const tmdbId = this.editing() ? (this.editing()!.tmdbId ?? null) : this.draftTmdbId;
      this.diary.upsert({
        id: this.editing()?.id,
        tmdbId,
        title: this.draftTitle,
        watchedAt: this.draftWatchedAt,
        location: this.draftLocation(),
        rating,
        tags,
        note: this.draftNote,
      });
      this.toast.show(
        'success',
        this.i18n.t('common.saved'),
        this.editing() ? this.i18n.t('diary.toast.updated') : this.i18n.t('diary.toast.created'),
      );
      this.sheetOpen.set(false);
    } catch {
      this.toast.show('error', this.i18n.t('common.error'), this.i18n.t('diary.toast.saveFailed'));
    }
  }

  remove(e: DiaryEntry): void {
    this.diary.remove(e.id);
    this.toast.show('info', this.i18n.t('common.deleted'), e.title);
  }

  locationLabel(loc: DiaryLocation): string {
    if (loc === 'cinema') return this.i18n.t('diary.location.cinema');
    if (loc === 'streaming') return this.i18n.t('diary.location.streaming');
    return this.i18n.t('diary.location.home');
  }

  trackById(_: number, e: DiaryEntry): string {
    return e.id;
  }

  trackByTag(_: number, t: string): string {
    return t;
  }
}

function computeStats(entries: readonly DiaryEntry[]): {
  total: number;
  avgRating: number | null;
  topTags: string[];
  topLocations: string[];
} {
  const total = entries.length;
  if (!total) return { total: 0, avgRating: null, topTags: [], topLocations: [] };

  const ratings = entries.map((e) => e.rating).filter((x): x is number => typeof x === 'number');
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

  const tagCounts = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.tags ?? []) {
      const k = String(t).trim().toLowerCase();
      if (!k) continue;
      tagCounts.set(k, (tagCounts.get(k) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([k]) => k);

  const locCounts = new Map<DiaryLocation, number>();
  for (const e of entries) {
    locCounts.set(e.location, (locCounts.get(e.location) ?? 0) + 1);
  }
  const topLocations = [...locCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => (k === 'cinema' ? 'Кинотеатр' : k === 'streaming' ? 'Стриминг' : 'Дома'));

  return { total, avgRating, topTags, topLocations };
}
