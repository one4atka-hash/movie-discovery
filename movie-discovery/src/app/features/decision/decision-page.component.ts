import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { ChipComponent } from '@shared/ui/chip/chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { SegmentedControlComponent } from '@shared/ui/segmented-control/segmented-control.component';
import { SectionComponent } from '@shared/ui/section/section.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { PageIntroComponent } from '@shared/ui/page-intro/page-intro.component';
import { DecisionService } from './decision.service';
import type { Movie } from '@features/movies/data-access/models/movie.model';
import { saveDecisionCandidatesForShare } from '@features/share-cards/decision-shortlist-share.storage';
import { pickWinner, type DecisionConstraints, type DecisionMode } from './decision.util';
import { MovieCardComponent } from '@features/movies/ui/movie-card/movie-card.component';
import { StreamingPrefsService } from '@features/streaming/streaming-prefs.service';

@Component({
  selector: 'app-decision-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EmptyStateComponent,
    CardComponent,
    ChipComponent,
    ButtonComponent,
    BottomSheetComponent,
    SegmentedControlComponent,
    SectionComponent,
    PageIntroComponent,
    MovieCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <app-page-intro
        [title]="i18n.t('nav.tonight')"
        [purpose]="i18n.t('decide.purpose')"
        [instruction]="i18n.t('decide.instruction')"
      />

      <app-card [title]="i18n.t('decide.constraints.title')">
        <p class="muted">{{ i18n.t('decide.constraints.hint') }}</p>

        <div class="row">
          <app-chip [selected]="maxMinutes() === 90" (clicked)="setMaxMinutes(90)">{{
            i18n.t('decide.constraints.runtime90')
          }}</app-chip>
          <app-chip [selected]="maxMinutes() === 110" (clicked)="setMaxMinutes(110)">{{
            i18n.t('decide.constraints.runtime110')
          }}</app-chip>
          <app-chip [selected]="maxMinutes() === 140" (clicked)="setMaxMinutes(140)">{{
            i18n.t('decide.constraints.runtime140')
          }}</app-chip>
        </div>
        <p class="muted muted--note">{{ i18n.t('decide.constraints.runtimeNote') }}</p>

        <div class="row" *ngIf="hasMyServices()">
          <app-chip [selected]="onlyMyServices()" (clicked)="toggleOnlyMyServices()">
            {{ i18n.t('decide.constraints.onlyMyServices') }}
          </app-chip>
          <a class="link" routerLink="/account" fragment="account-streaming">{{
            i18n.t('decide.constraints.configure')
          }}</a>
        </div>

        <div class="row">
          <app-chip [selected]="genre() === 'thriller'" (clicked)="setGenre('thriller')">
            {{ i18n.t('decide.constraints.genre.thriller') }}
          </app-chip>
          <app-chip [selected]="genre() === 'comedy'" (clicked)="setGenre('comedy')">
            {{ i18n.t('decide.constraints.genre.comedy') }}
          </app-chip>
          <app-chip [selected]="genre() === 'drama'" (clicked)="setGenre('drama')">{{
            i18n.t('decide.constraints.genre.drama')
          }}</app-chip>
        </div>

        <div class="actions" cardActions>
          <app-button variant="ghost" (click)="reset()">{{ i18n.t('common.reset') }}</app-button>
          <app-button variant="secondary" (click)="openMore.set(true)">{{
            i18n.t('decide.more.open')
          }}</app-button>
          <app-button
            data-testid="decision-build-shortlist"
            [loading]="loading()"
            (click)="build()"
            >{{ i18n.t('decide.build') }}</app-button
          >
        </div>
      </app-card>

      <app-bottom-sheet
        [open]="openMore()"
        [title]="i18n.t('decide.more.title')"
        [ariaLabel]="i18n.t('decide.more.aria')"
        (closed)="openMore.set(false)"
      >
        <p class="muted">{{ i18n.t('decide.more.subtitle') }}</p>

        <div class="row">
          <app-chip [selected]="preset() === 'weeknight'" (clicked)="applyPreset('weeknight')">
            {{ i18n.t('decide.preset.weeknight') }}
          </app-chip>
          <app-chip [selected]="preset() === 'date'" (clicked)="applyPreset('date')">
            {{ i18n.t('decide.preset.date') }}
          </app-chip>
          <app-chip [selected]="preset() === 'family'" (clicked)="applyPreset('family')">
            {{ i18n.t('decide.preset.family') }}
          </app-chip>
        </div>

        <p class="muted" *ngIf="hasMyServices()">
          {{ i18n.t('decide.more.myServicesHint') }}
        </p>
        <div class="sheetActions">
          <app-button
            variant="secondary"
            (click)="toast.show('info', i18n.t('common.saved'), i18n.t('decide.more.saved'))"
            >{{ i18n.t('common.save') }}</app-button
          >
          <app-button variant="ghost" (click)="openMore.set(false)">{{
            i18n.t('common.close')
          }}</app-button>
        </div>
      </app-bottom-sheet>

      <app-section
        [title]="i18n.t('decide.shortlist.title')"
        *ngIf="candidates().length"
        data-testid="decision-shortlist"
      >
        <div sectionActions>
          <app-segmented
            [ariaLabel]="i18n.t('decide.mode.aria')"
            [options]="modeOptions()"
            [value]="mode()"
            (select)="mode.set($event)"
          />
          <app-button data-testid="decision-pick-winner" variant="secondary" (click)="pick()">{{
            i18n.t('decide.pick')
          }}</app-button>
        </div>

        <div class="grid">
          <a
            class="grid__item"
            *ngFor="let m of shortlist(); trackBy: trackByMovieId"
            [routerLink]="['/movie', m.id]"
          >
            <app-movie-card [movie]="m" />
          </a>
        </div>
      </app-section>

      <app-card
        [title]="i18n.t('decide.winner.title')"
        *ngIf="winner() as w"
        data-testid="decision-winner-card"
      >
        <div class="winner">
          <div class="winner__left">
            <strong class="winner__title">{{ w.title }}</strong>
            <p class="muted" *ngIf="w.overview">{{ w.overview }}</p>
          </div>
          <div class="winner__actions">
            <app-button
              data-testid="decision-winner-open"
              variant="secondary"
              [routerLink]="['/movie', w.id]"
              >{{ i18n.t('common.open') }}</app-button
            >
            <app-button variant="ghost" (click)="pick()">{{
              i18n.t('decide.pickAgain')
            }}</app-button>
          </div>
        </div>
      </app-card>

      <app-empty-state
        *ngIf="!candidates().length && !loading()"
        [title]="i18n.t('decide.empty.title')"
        [subtitle]="i18n.t('decide.empty.subtitle')"
      >
        <app-button variant="secondary" [routerLink]="['/']">{{
          i18n.t('home.cta.search')
        }}</app-button>
      </app-empty-state>
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
        margin: 0 0 0.8rem;
        color: var(--text-muted);
        line-height: 1.5;
      }
      .muted--note {
        margin-top: -0.25rem;
        color: var(--text-faint);
        font-size: 0.92rem;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-bottom: 0.55rem;
      }
      .link {
        align-self: center;
        color: var(--text-muted);
        text-decoration: none;
        border-bottom: 1px dashed color-mix(in srgb, var(--text-muted) 55%, transparent);
        padding-bottom: 2px;
      }
      .link:hover {
        color: var(--text);
        border-bottom-color: color-mix(in srgb, var(--text) 60%, transparent);
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .sheetActions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        margin-top: 0.9rem;
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
      .grid__item:hover {
        transform: translateY(-2px);
        transition: transform 0.18s ease;
      }
      .winner {
        display: flex;
        gap: 0.9rem;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      .winner__title {
        display: block;
        margin-bottom: 0.35rem;
      }
      .winner__actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }
      .btn {
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
        padding: 0.55rem 0.9rem;
        cursor: pointer;
        font: inherit;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition:
          transform 0.15s ease,
          background 0.15s ease,
          border-color 0.15s ease;
      }
      .btn:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.14);
      }
    `,
  ],
})
export class DecisionPageComponent {
  readonly i18n = inject(I18nService);
  readonly toast = inject(ToastService);
  private readonly decision = inject(DecisionService);
  private readonly streamingPrefs = inject(StreamingPrefsService);

  readonly openMore = signal(false);
  readonly maxMinutes = signal<number | null>(110);
  readonly genre = signal<'thriller' | 'comedy' | 'drama' | null>(null);
  readonly onlyMyServices = signal(false);
  readonly preset = signal<'weeknight' | 'date' | 'family' | null>(null);
  readonly mode = signal<DecisionMode>('top5');
  readonly candidates = signal<Movie[]>([]);
  readonly winner = signal<Movie | null>(null);
  readonly loading = signal(false);

  readonly hasMyServices = computed(() => this.streamingPrefs.providers().length > 0);

  readonly modeOptions = computed(() => [
    { value: 'top5' as const, label: this.i18n.t('decide.mode.top5') },
    { value: 'roulette' as const, label: this.i18n.t('decide.mode.roulette') },
  ]);

  readonly constraints = computed<DecisionConstraints>(() => ({
    maxMinutes: this.maxMinutes(),
    genre: this.genre(),
    onlyMyServices: this.onlyMyServices() && this.hasMyServices(),
    region: this.streamingPrefs.region(),
    myProviders: this.streamingPrefs.providers(),
  }));

  readonly shortlist = computed(() => {
    const arr = this.candidates();
    return this.mode() === 'top5' ? arr.slice(0, 5) : arr.slice(0, 12);
  });

  setMaxMinutes(v: number): void {
    this.maxMinutes.set(this.maxMinutes() === v ? null : v);
  }

  setGenre(v: 'thriller' | 'comedy' | 'drama'): void {
    this.genre.set(this.genre() === v ? null : v);
  }

  reset(): void {
    this.maxMinutes.set(null);
    this.genre.set(null);
    this.onlyMyServices.set(false);
    this.preset.set(null);
    this.candidates.set([]);
    this.winner.set(null);
    this.toast.show('info', this.i18n.t('common.resetDone'), this.i18n.t('decide.toast.reset'));
  }

  toggleOnlyMyServices(): void {
    if (!this.hasMyServices()) return;
    this.onlyMyServices.set(!this.onlyMyServices());
  }

  applyPreset(kind: 'weeknight' | 'date' | 'family'): void {
    this.preset.set(this.preset() === kind ? null : kind);
    const v = this.preset();
    if (!v) return;

    if (v === 'weeknight') {
      this.maxMinutes.set(110);
      this.genre.set(null);
    } else if (v === 'date') {
      this.maxMinutes.set(140);
      this.genre.set('drama');
    } else {
      this.maxMinutes.set(110);
      this.genre.set('comedy');
    }

    if (this.hasMyServices()) this.onlyMyServices.set(true);
  }

  build(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.winner.set(null);
    this.decision.buildCandidates(this.constraints()).subscribe({
      next: (arr) => {
        this.candidates.set(arr);
        saveDecisionCandidatesForShare(arr);
        if (!arr.length) {
          this.toast.show(
            'warning',
            this.i18n.t('common.empty'),
            this.i18n.t('decide.toast.noCandidates'),
          );
        } else {
          this.toast.show(
            'success',
            this.i18n.t('common.done'),
            this.i18n.t('decide.toast.candidates').replace('{{n}}', String(arr.length)),
          );
        }
      },
      error: () => {
        this.toast.show(
          'error',
          this.i18n.t('common.error'),
          this.i18n.t('decide.toast.buildFailed'),
        );
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  pick(): void {
    const w = pickWinner(this.shortlist(), this.mode());
    this.winner.set(w);
    if (!w) {
      this.toast.show(
        'warning',
        this.i18n.t('decide.toast.noWinnerTitle'),
        this.i18n.t('decide.toast.noWinnerBody'),
      );
      return;
    }
    this.toast.show('success', this.i18n.t('decide.toast.winnerTitle'), w.title);
  }

  trackByMovieId(_: number, m: Movie): number {
    return m.id;
  }
}
