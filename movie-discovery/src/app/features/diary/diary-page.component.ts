import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { ChipComponent } from '@shared/ui/chip/chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="head">
        <h1 class="title">{{ i18n.t('nav.diary') }}</h1>
        <p class="sub">Журнал просмотров: записи, теги, оценки и заметки.</p>
      </header>

      <app-section title="Записи">
        <div sectionActions>
          <app-button (click)="openCreate()">Log watch</app-button>
        </div>

        <app-empty-state
          *ngIf="!entries().length"
          title="Пока пусто"
          subtitle="Добавьте первую запись — потом появятся фильтры, статистика и импорт."
        >
          <app-button variant="secondary" (click)="openCreate()">Добавить запись</app-button>
          <app-button variant="ghost" routerLink="/">Открыть поиск</app-button>
        </app-empty-state>

        <div class="list" *ngIf="entries().length">
          <app-card *ngFor="let e of entries(); trackBy: trackById" [title]="e.title">
            <div class="meta">
              <span class="pill">{{ e.watchedAt }}</span>
              <span class="pill">{{ locationLabel(e.location) }}</span>
              @if (e.rating != null) {
                <span class="pill">★ {{ e.rating }}</span>
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
              <app-button variant="secondary" (click)="openEdit(e)">Edit</app-button>
              <app-button variant="danger" (click)="remove(e)">Delete</app-button>
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
      .pill {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-full);
        padding: 0.2rem 0.55rem;
        font-size: 0.82rem;
        color: var(--text-muted);
        background: rgba(255, 255, 255, 0.03);
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

  readonly sheetOpen = signal(false);
  readonly editing = signal<DiaryEntry | null>(null);

  readonly entries = computed(() => this.diary.sorted());

  draftTitle = '';
  draftWatchedAt = new Date().toISOString().slice(0, 10);
  readonly draftLocation = signal<DiaryLocation>('home');
  draftRating: string = '';
  draftTags = '';
  draftNote = '';

  openCreate(): void {
    this.editing.set(null);
    this.draftTitle = '';
    this.draftWatchedAt = new Date().toISOString().slice(0, 10);
    this.draftLocation.set('home');
    this.draftRating = '';
    this.draftTags = '';
    this.draftNote = '';
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
      this.diary.upsert({
        id: this.editing()?.id,
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
