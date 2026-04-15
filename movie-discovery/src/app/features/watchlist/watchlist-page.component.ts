import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '@shared/i18n/i18n.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { SegmentedControlComponent } from '@shared/ui/segmented-control/segmented-control.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { tmdbImg } from '@core/tmdb-images';
import type { WatchStatus } from './watch-state.model';
import { WatchStateService } from './watch-state.service';

type WatchTab = 'all' | WatchStatus;

@Component({
  selector: 'app-watchlist-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EmptyStateComponent,
    SectionComponent,
    SegmentedControlComponent,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page" [class.page--embedded]="embedded()">
      @if (!embedded()) {
        <a class="back" routerLink="/">← {{ i18n.t('nav.home') }}</a>

        <header class="head">
          <h1 class="title">Watchlist</h1>
          <p class="sub">Статусы: хочу / смотрю / посмотрел / брошено / скрыто.</p>
        </header>
      }

      <app-section title="Статус">
        <div sectionActions class="watch-toolbar">
          <app-segmented
            ariaLabel="Watchlist filter"
            [options]="tabOptions"
            [value]="tab()"
            (select)="tab.set($event)"
          />
          <app-button
            variant="ghost"
            data-testid="watchlist-bulk-want"
            [disabled]="!filtered().length"
            (click)="bulkWant()"
            >Want all</app-button
          >
          <app-button
            variant="ghost"
            data-testid="watchlist-bulk-hide"
            [disabled]="!filtered().length"
            (click)="bulkHide()"
            >Hide all</app-button
          >
        </div>
      </app-section>

      <app-empty-state
        *ngIf="!filtered().length"
        title="Пока пусто"
        subtitle="Поставьте статус фильму прямо на карточке (новая кнопка) — и он появится здесь."
      >
        <app-button variant="secondary" routerLink="/">Открыть поиск</app-button>
      </app-empty-state>

      <div class="list" *ngIf="filtered().length" data-testid="watchlist-list">
        <app-card *ngFor="let it of filtered(); trackBy: trackById" [title]="it.movie.title">
          <div class="row">
            <div class="thumb" [class.thumb--empty]="!it.movie.poster_path">
              <img
                *ngIf="it.movie.poster_path as p"
                [src]="posterUrl(p)"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <div class="meta">
              <div class="pills">
                <app-badge>{{ statusLabel(it.status) }}</app-badge>
                <app-badge variant="muted" *ngIf="it.movie.release_date">{{
                  it.movie.release_date
                }}</app-badge>
                <app-badge variant="accent"
                  >★ {{ it.movie.vote_average | number: '1.1-1' }}</app-badge
                >
              </div>
              <div class="actions">
                <app-button variant="secondary" [routerLink]="['/movie', it.tmdbId]"
                  >Открыть</app-button
                >
                <app-button variant="ghost" (click)="svc.setStatus(toMovie(it), null)"
                  >Очистить</app-button
                >
              </div>
            </div>
          </div>
        </app-card>
      </div>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
      }
      .page--embedded {
        padding: 0;
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
        max-width: 72ch;
        line-height: 1.5;
      }
      .list {
        display: grid;
        gap: 0.75rem;
      }
      .row {
        display: grid;
        grid-template-columns: 46px 1fr;
        gap: 0.8rem;
        align-items: start;
      }
      .thumb {
        width: 46px;
        height: 70px;
        border-radius: 12px;
        border: 1px solid var(--border-subtle);
        overflow: hidden;
        background: rgba(255, 255, 255, 0.04);
      }
      .thumb--empty {
        background: linear-gradient(145deg, rgba(255, 107, 107, 0.2), rgba(255, 195, 113, 0.12));
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .pills {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-bottom: 0.65rem;
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class WatchlistPageComponent {
  readonly embedded = input(false);
  readonly i18n = inject(I18nService);
  readonly svc = inject(WatchStateService);

  readonly tab = signal<WatchTab>('all');
  readonly tabOptions = [
    { value: 'all' as const, label: 'All' },
    { value: 'want' as const, label: 'Want' },
    { value: 'watching' as const, label: 'Watching' },
    { value: 'watched' as const, label: 'Watched' },
    { value: 'dropped' as const, label: 'Dropped' },
    { value: 'hidden' as const, label: 'Hidden' },
  ];

  readonly filtered = computed(() => {
    const t = this.tab();
    const all = this.svc.sorted();
    if (t === 'all') return all;
    return all.filter((i) => i.status === t);
  });

  posterUrl(path: string): string {
    return tmdbImg(92, path);
  }

  statusLabel(s: WatchStatus): string {
    if (s === 'want') return 'Want';
    if (s === 'watching') return 'Watching';
    if (s === 'watched') return 'Watched';
    if (s === 'dropped') return 'Dropped';
    return 'Hidden';
  }

  toMovie(it: {
    tmdbId: number;
    movie: {
      title: string;
      poster_path: string | null;
      release_date: string;
      vote_average: number;
    };
  }) {
    return {
      id: it.tmdbId,
      title: it.movie.title,
      overview: '',
      poster_path: it.movie.poster_path,
      backdrop_path: null,
      release_date: it.movie.release_date,
      vote_average: it.movie.vote_average,
    };
  }

  trackById(_: number, it: { tmdbId: number; updatedAt: number }): string {
    return `${it.tmdbId}:${it.updatedAt}`;
  }

  bulkWant(): void {
    const f = this.filtered();
    this.svc.bulkSetStatus(f.map((i) => ({ tmdbId: i.tmdbId, status: 'want' })));
  }

  bulkHide(): void {
    const f = this.filtered();
    this.svc.bulkSetStatus(f.map((i) => ({ tmdbId: i.tmdbId, status: 'hidden' })));
  }
}
