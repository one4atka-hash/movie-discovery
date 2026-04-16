import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { I18nService } from '@shared/i18n/i18n.service';
import { PageIntroComponent } from '@shared/ui/page-intro/page-intro.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { SegmentedControlComponent } from '@shared/ui/segmented-control/segmented-control.component';
import { WatchlistPageComponent } from '@features/watchlist/watchlist-page.component';
import { CollectionsPageComponent } from './collections-page.component';

type ListsTab = 'statuses' | 'collections';

@Component({
  selector: 'app-lists-hub-page',
  standalone: true,
  imports: [
    CommonModule,
    PageIntroComponent,
    SectionComponent,
    SegmentedControlComponent,
    WatchlistPageComponent,
    CollectionsPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <app-page-intro
        [title]="i18n.t('nav.lists')"
        [purpose]="i18n.t('lists.purpose')"
        [instruction]="i18n.t('lists.instruction')"
      />

      <app-section [title]="i18n.t('lists.hub.title')">
        <div sectionActions>
          <app-segmented
            [ariaLabel]="i18n.t('lists.hub.tabs.aria')"
            [options]="tabOptions()"
            [value]="tab()"
            (select)="setTab($event)"
          />
        </div>
      </app-section>

      @if (tab() === 'statuses') {
        <app-watchlist-page [embedded]="true" />
      } @else {
        <app-collections-page [embedded]="true" />
      }
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
      }
    `,
  ],
})
export class ListsHubPageComponent {
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _tab = signal<ListsTab>('collections');
  readonly tab = this._tab.asReadonly();

  readonly tabOptions = computed(() => [
    { value: 'statuses' as const, label: this.i18n.t('lists.hub.tabs.statuses') },
    { value: 'collections' as const, label: this.i18n.t('lists.hub.tabs.collections') },
  ]);

  constructor() {
    this.syncTabFromUrl(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (e) => this.syncTabFromUrl(e.urlAfterRedirects),
      });
  }

  setTab(t: ListsTab): void {
    const base = this.isAccountScoped(this.router.url) ? '/account/lists' : '/collections';
    void this.router.navigateByUrl(t === 'statuses' ? `${base}/statuses` : base);
  }

  private syncTabFromUrl(url: string): void {
    this._tab.set(url.includes('/statuses') ? 'statuses' : 'collections');
  }

  private isAccountScoped(url: string): boolean {
    return url.includes('/account/lists');
  }
}
