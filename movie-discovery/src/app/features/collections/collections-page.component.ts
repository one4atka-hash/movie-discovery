import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import type { Collection, CollectionVisibility } from './collections.model';
import { CollectionsService } from './collections.service';

@Component({
  selector: 'app-collections-page',
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="head">
        <h1 class="title">{{ i18n.t('nav.lists') }}</h1>
        <p class="sub">
          Коллекции, watchlist по статусам и авто‑подборки (Rule Builder будет переиспользован).
        </p>
      </header>

      <app-section title="Collections">
        <div sectionActions>
          <app-button (click)="openCreate()">New collection</app-button>
        </div>

        <app-empty-state
          *ngIf="!collections().length"
          title="Нет списков"
          subtitle="Создайте коллекцию и добавьте туда фильмы. Дальше — авто‑коллекции и taste summary."
        >
          <app-button variant="secondary" (click)="openCreate()">Создать</app-button>
          <app-button variant="ghost" routerLink="/">Открыть поиск</app-button>
        </app-empty-state>

        <div class="grid" *ngIf="collections().length">
          <app-card *ngFor="let c of collections(); trackBy: trackById" [title]="c.name">
            @if (c.description) {
              <p class="muted">{{ c.description }}</p>
            }
            <p class="muted">Items: {{ c.items.length }} · {{ visibilityLabel(c.visibility) }}</p>

            <div class="actions">
              <app-button variant="secondary" (click)="select(c)">Open</app-button>
              <app-button variant="ghost" (click)="openEdit(c)">Edit</app-button>
              <app-button variant="danger" (click)="remove(c)">Delete</app-button>
            </div>
          </app-card>
        </div>
      </app-section>

      <app-section title="Selected" *ngIf="selected() as s">
        <div sectionActions>
          <app-button variant="secondary" (click)="openAddItem()">Add item</app-button>
          <app-button variant="ghost" (click)="selected.set(null)">Close</app-button>
        </div>

        <app-empty-state
          *ngIf="!s.items.length"
          title="Пусто"
          subtitle="Добавьте первый фильм (пока вручную: title + optional TMDB id)."
        >
          <app-button variant="secondary" (click)="openAddItem()">Add item</app-button>
        </app-empty-state>

        <div class="list" *ngIf="s.items.length">
          <app-card *ngFor="let it of s.items; trackBy: trackByItem" [title]="it.title">
            @if (it.tmdbId != null) {
              <p class="muted">TMDB id: {{ it.tmdbId }}</p>
            }
            @if (it.note) {
              <p class="muted">{{ it.note }}</p>
            }
            <div class="actions">
              <app-button variant="danger" (click)="removeItem(s.id, it.createdAt)"
                >Remove</app-button
              >
              @if (it.tmdbId != null) {
                <app-button variant="ghost" [routerLink]="['/movie', it.tmdbId]"
                  >Open movie</app-button
                >
              }
            </div>
          </app-card>
        </div>
      </app-section>

      <app-bottom-sheet
        [open]="sheetOpen()"
        [title]="editing() ? 'Edit collection' : 'New collection'"
        ariaLabel="Collection editor"
        (closed)="closeSheet()"
      >
        <form class="form" (submit)="saveCollection($event)">
          <app-form-field label="Name">
            <input [(ngModel)]="draftName" name="name" required />
          </app-form-field>
          <app-form-field label="Description">
            <textarea [(ngModel)]="draftDescription" name="description" rows="2"></textarea>
          </app-form-field>
          <app-form-field label="Visibility">
            <select [(ngModel)]="draftVisibility" name="visibility">
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </app-form-field>
          <div class="formActions">
            <app-button variant="ghost" type="button" (click)="closeSheet()">Cancel</app-button>
            <app-button type="submit">Save</app-button>
          </div>
        </form>
      </app-bottom-sheet>

      <app-bottom-sheet
        [open]="addItemOpen()"
        title="Add item"
        ariaLabel="Add collection item"
        (closed)="addItemOpen.set(false)"
      >
        <form class="form" (submit)="saveItem($event)">
          <app-form-field label="Title">
            <input [(ngModel)]="draftItemTitle" name="title" required />
          </app-form-field>
          <app-form-field label="TMDB id (optional)">
            <input [(ngModel)]="draftItemTmdbId" name="tmdbId" type="number" min="1" />
          </app-form-field>
          <app-form-field label="Note (optional)">
            <textarea [(ngModel)]="draftItemNote" name="note" rows="2"></textarea>
          </app-form-field>
          <div class="formActions">
            <app-button variant="ghost" type="button" (click)="addItemOpen.set(false)"
              >Cancel</app-button
            >
            <app-button type="submit">Add</app-button>
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
      .muted {
        margin: 0 0 0.65rem;
        color: var(--text-muted);
        line-height: 1.45;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 0.8rem;
        justify-items: start;
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }
      .list {
        display: grid;
        gap: 0.75rem;
      }
      .form {
        display: grid;
        gap: 0.75rem;
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
export class CollectionsPageComponent {
  readonly i18n = inject(I18nService);
  readonly toast = inject(ToastService);
  private readonly svc = inject(CollectionsService);

  readonly collections = computed(() => this.svc.sorted());
  readonly selected = signal<Collection | null>(null);

  readonly sheetOpen = signal(false);
  readonly editing = signal<Collection | null>(null);

  draftName = '';
  draftDescription = '';
  draftVisibility: CollectionVisibility = 'private';

  readonly addItemOpen = signal(false);
  draftItemTitle = '';
  draftItemTmdbId = '';
  draftItemNote = '';

  openCreate(): void {
    this.editing.set(null);
    this.draftName = '';
    this.draftDescription = '';
    this.draftVisibility = 'private';
    this.sheetOpen.set(true);
  }

  openEdit(c: Collection): void {
    this.editing.set(c);
    this.draftName = c.name;
    this.draftDescription = c.description ?? '';
    this.draftVisibility = c.visibility;
    this.sheetOpen.set(true);
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
  }

  saveCollection(ev: Event): void {
    ev.preventDefault();
    try {
      const c = this.svc.upsertCollection({
        id: this.editing()?.id,
        name: this.draftName,
        description: this.draftDescription,
        visibility: this.draftVisibility,
      });
      this.toast.show('success', 'Saved', c.name);
      this.sheetOpen.set(false);
    } catch {
      this.toast.show('error', 'Error', 'Could not save collection');
    }
  }

  select(c: Collection): void {
    // Refresh from source of truth (service) in case it changed.
    this.selected.set(this.svc.getById(c.id));
  }

  remove(c: Collection): void {
    this.svc.removeCollection(c.id);
    if (this.selected()?.id === c.id) this.selected.set(null);
    this.toast.show('info', 'Deleted', c.name);
  }

  openAddItem(): void {
    this.draftItemTitle = '';
    this.draftItemTmdbId = '';
    this.draftItemNote = '';
    this.addItemOpen.set(true);
  }

  saveItem(ev: Event): void {
    ev.preventDefault();
    const s = this.selected();
    if (!s) return;
    try {
      const tmdbId = this.draftItemTmdbId.trim() ? Number(this.draftItemTmdbId) : null;
      this.svc.addItem(s.id, {
        tmdbId: Number.isFinite(tmdbId as number) ? tmdbId : null,
        title: this.draftItemTitle,
        note: this.draftItemNote,
      });
      this.selected.set(this.svc.getById(s.id));
      this.toast.show('success', 'Added', this.draftItemTitle.trim());
      this.addItemOpen.set(false);
    } catch {
      this.toast.show('error', 'Error', 'Could not add item');
    }
  }

  removeItem(collectionId: string, createdAt: number): void {
    this.svc.removeItem(collectionId, createdAt);
    this.selected.set(this.svc.getById(collectionId));
    this.toast.show('info', 'Removed', 'Item removed');
  }

  visibilityLabel(v: CollectionVisibility): string {
    if (v === 'public') return 'Public';
    if (v === 'unlisted') return 'Unlisted';
    return 'Private';
  }

  trackById(_: number, c: Collection): string {
    return c.id;
  }

  trackByItem(_: number, it: { createdAt: number }): number {
    return it.createdAt;
  }
}
