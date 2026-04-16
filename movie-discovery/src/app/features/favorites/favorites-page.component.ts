import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import { MovieCardComponent } from '@features/movies/ui/movie-card/movie-card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MovieCardComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">← {{ i18n.t('nav.home') }}</a>

      <header class="head">
        <h1 class="title">{{ i18n.t('nav.favorites') }}</h1>
      </header>

      <app-empty-state
        *ngIf="!favorites().length"
        [title]="i18n.t('account.section.favorites')"
        [subtitle]="i18n.t('home.favoritesEmptySubtitle')"
      />

      <ng-container *ngIf="favorites().length">
        <section class="series" *ngFor="let g of grouped(); trackBy: trackByGroupKey">
          <h2 class="series__title">{{ g.label }}</h2>
          <div class="grid">
            <div class="grid__item" *ngFor="let m of g.items; trackBy: trackById">
              <app-movie-card [movie]="m" [detailLink]="['/movie', m.id]" />
            </div>
          </div>
        </section>
      </ng-container>
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
        margin: 0;
      }
      .series {
        margin-bottom: 1.2rem;
      }
      .series__title {
        margin: 0 0 0.65rem;
        font-size: 1.05rem;
        color: var(--text-muted);
        font-weight: 600;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.9rem;
        justify-items: start;
      }
      .grid__item {
        width: 100%;
        max-width: 220px;
        text-decoration: none;
        color: inherit;
      }
    `,
  ],
})
export class FavoritesPageComponent {
  readonly i18n = inject(I18nService);
  private readonly fav = inject(FavoritesService);

  readonly favorites = computed(() => this.fav.favorites());

  readonly grouped = computed(() => {
    const list = this.favorites();
    const byKey = new Map<string, { key: string; label: string; items: any[] }>();
    for (const m of list) {
      const key = seriesKeyFromTitle(m.title);
      const label = seriesLabelFromKey(key);
      const g = byKey.get(key) ?? { key, label, items: [] };
      g.items.push(m);
      byKey.set(key, g);
    }
    const groups = [...byKey.values()];
    for (const g of groups) {
      g.items.sort(
        (a, b) => (a.release_date ?? '').localeCompare(b.release_date ?? '') || a.id - b.id,
      );
    }
    groups.sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label));
    return groups;
  });

  trackById(_: number, m: { id: number }): number {
    return m.id;
  }

  trackByGroupKey(_: number, g: { key: string }): string {
    return g.key;
  }
}

function seriesKeyFromTitle(title: string): string {
  const t = (title ?? '').trim().toLowerCase();
  if (!t) return 'other';
  const base = t
    .replace(/\(\d{4}\)\s*$/, '')
    .split(':')[0]!
    .split('—')[0]!
    .split('-')[0]!
    .trim();
  // remove sequel markers at the end
  const cleaned = base
    .replace(/\b(episode|part|chapter|vol|volume)\s+\d+\b/g, '')
    .replace(/\b[ivx]{1,6}\b$/i, '')
    .replace(/\b\d+\b$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'other';
}

function seriesLabelFromKey(key: string): string {
  if (key === 'other') return 'Other';
  return key
    .split(' ')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ''))
    .join(' ');
}
