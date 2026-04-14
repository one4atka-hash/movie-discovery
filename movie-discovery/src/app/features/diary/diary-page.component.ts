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

      <app-section title="Записи">
        <div sectionActions>
          <app-button (click)="openCreate()">Добавить запись</app-button>
        </div>

        <div class="stats" *ngIf="stats() as s">
          <app-badge variant="muted">Всего: {{ s.total }}</app-badge>
          @if (s.avgRating != null) {
            <app-badge variant="accent">★ {{ s.avgRating }}</app-badge>
          }
          @if (s.topTags.length) {
            <app-badge>Теги: {{ s.topTags.join(', ') }}</app-badge>
          }
          @if (s.topLocations.length) {
            <app-badge variant="muted">Где: {{ s.topLocations.join(' · ') }}</app-badge>
          }
        </div>

        <app-empty-state
          *ngIf="!entries().length"
          title="Пока пусто"
          subtitle="Добавь первую запись — и дневник начнёт “помнить” за тебя."
        >
          <app-button variant="secondary" (click)="openCreate()">Добавить запись</app-button>
          <app-button variant="ghost" routerLink="/">Найти фильм</app-button>
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
              <app-button variant="secondary" (click)="openEdit(e)">Изменить</app-button>
              <app-button variant="danger" (click)="remove(e)">Удалить</app-button>
            </div>
          </app-card>
        </div>
      </app-section>

      <app-bottom-sheet
        [open]="sheetOpen()"
        [title]="editing() ? 'Edit entry' : 'New entry'"
        ariaLabel="Diary entry editor"
        (closed)="closeSheet()"
      >
        <form class="form" (submit)="save($event)">
          <app-form-field label="Title">
            <input [(ngModel)]="draftTitle" name="title" required />
          </app-form-field>

          <app-form-field label="Watched at" hint="Date in YYYY-MM-DD">
            <input [(ngModel)]="draftWatchedAt" name="watchedAt" type="date" required />
          </app-form-field>

          <app-form-field label="Location">
            <div class="chips">
              <app-chip
                [selected]="draftLocation() === 'cinema'"
                (clicked)="draftLocation.set('cinema')"
              >
                Cinema
              </app-chip>
              <app-chip
                [selected]="draftLocation() === 'streaming'"
                (clicked)="draftLocation.set('streaming')"
              >
                Streaming
              </app-chip>
              <app-chip
                [selected]="draftLocation() === 'home'"
                (clicked)="draftLocation.set('home')"
              >
                Home
              </app-chip>
            </div>
          </app-form-field>

          <app-form-field label="Rating (0..10)">
            <input
              [(ngModel)]="draftRating"
              name="rating"
              type="number"
              min="0"
              max="10"
              step="0.5"
            />
          </app-form-field>

          <app-form-field label="Tags" hint="Comma separated, e.g. thriller, rewatch">
            <input [(ngModel)]="draftTags" name="tags" />
          </app-form-field>

          <app-form-field label="Note">
            <textarea [(ngModel)]="draftNote" name="note" rows="3"></textarea>
          </app-form-field>

          <div class="formActions">
            <app-button variant="ghost" type="button" (click)="closeSheet()">Cancel</app-button>
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
      this.toast.show('success', 'Saved', this.editing() ? 'Entry updated' : 'Entry created');
      this.sheetOpen.set(false);
    } catch {
      this.toast.show('error', 'Error', 'Could not save entry');
    }
  }

  remove(e: DiaryEntry): void {
    this.diary.remove(e.id);
    this.toast.show('info', 'Deleted', e.title);
  }

  locationLabel(loc: DiaryLocation): string {
    if (loc === 'cinema') return 'Cinema';
    if (loc === 'streaming') return 'Streaming';
    return 'Home';
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
    .map(([k]) => (k === 'cinema' ? 'Cinema' : k === 'streaming' ? 'Streaming' : 'Home'));

  return { total, avgRating, topTags, topLocations };
}
