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
    MovieCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="head">
        <h1 class="title">{{ i18n.t('nav.tonight') }}</h1>
        <p class="sub">
          Decision Mode (MVP): ограничения → shortlist → победитель. Дальше подключим правила, «мои
          сервисы» и explainable рекомендации.
        </p>
      </header>

      <app-card title="Ограничения (MVP)">
        <p class="muted">
          Выберите 1–2 ограничения — и мы соберём shortlist. Этот UI будет переиспользован в Rule
          Builder и фильтрах Discover.
        </p>

        <div class="row">
          <app-chip [selected]="maxMinutes() === 90" (clicked)="setMaxMinutes(90)"
            >≤ 90 мин</app-chip
          >
          <app-chip [selected]="maxMinutes() === 110" (clicked)="setMaxMinutes(110)"
            >≤ 110 мин</app-chip
          >
          <app-chip [selected]="maxMinutes() === 140" (clicked)="setMaxMinutes(140)"
            >≤ 140 мин</app-chip
          >
        </div>

        <div class="row" *ngIf="hasMyServices()">
          <app-chip [selected]="onlyMyServices()" (clicked)="toggleOnlyMyServices()">
            Только на моих сервисах
          </app-chip>
          <a class="link" routerLink="/account" fragment="account-streaming">Настроить</a>
        </div>

        <div class="row">
          <app-chip [selected]="genre() === 'thriller'" (clicked)="setGenre('thriller')">
            Триллер
          </app-chip>
          <app-chip [selected]="genre() === 'comedy'" (clicked)="setGenre('comedy')">
            Комедия
          </app-chip>
          <app-chip [selected]="genre() === 'drama'" (clicked)="setGenre('drama')">Драма</app-chip>
        </div>

        <div class="actions" cardActions>
          <app-button variant="ghost" (click)="reset()">Сбросить</app-button>
          <app-button variant="secondary" (click)="openMore.set(true)">Ещё…</app-button>
          <app-button data-testid="decision-build-shortlist" [loading]="loading()" (click)="build()"
            >Собрать shortlist</app-button
          >
        </div>
      </app-card>

      <app-bottom-sheet
        [open]="openMore()"
        title="Ещё ограничения"
        ariaLabel="More constraints"
        (closed)="openMore.set(false)"
      >
        <p class="muted">Пресеты (MVP) — быстро собрать shortlist под сценарий.</p>

        <div class="row">
          <app-chip [selected]="preset() === 'weeknight'" (clicked)="applyPreset('weeknight')">
            Будний вечер
          </app-chip>
          <app-chip [selected]="preset() === 'date'" (clicked)="applyPreset('date')">
            Свидание
          </app-chip>
          <app-chip [selected]="preset() === 'family'" (clicked)="applyPreset('family')">
            Семейный
          </app-chip>
        </div>

        <p class="muted" *ngIf="hasMyServices()">
          В пресетах мы включаем «Только на моих сервисах» по умолчанию.
        </p>
        <div class="sheetActions">
          <app-button
            variant="secondary"
            (click)="toast.show('info', 'Сохранено', 'Настройки применены')"
            >Сохранить</app-button
          >
          <app-button variant="ghost" (click)="openMore.set(false)">Закрыть</app-button>
        </div>
      </app-bottom-sheet>

      <app-section title="Shortlist" *ngIf="candidates().length" data-testid="decision-shortlist">
        <div sectionActions>
          <app-segmented
            ariaLabel="Decision mode"
            [options]="modeOptions"
            [value]="mode()"
            (select)="mode.set($event)"
          />
          <app-button data-testid="decision-pick-winner" variant="secondary" (click)="pick()"
            >Выбрать</app-button
          >
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

      <app-card title="Победитель" *ngIf="winner() as w" data-testid="decision-winner-card">
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
              >Открыть</app-button
            >
            <app-button variant="ghost" (click)="pick()">Перевыбрать</app-button>
          </div>
        </div>
      </app-card>

      <app-empty-state
        *ngIf="!candidates().length && !loading()"
        title="Пока пусто"
        subtitle="Нажмите “Собрать shortlist”. Чем больше избранного — тем точнее рекомендации."
      >
        <app-button variant="secondary" [routerLink]="['/']">Открыть поиск</app-button>
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

  readonly modeOptions = [
    { value: 'top5' as const, label: 'Top 5' },
    { value: 'roulette' as const, label: 'Roulette' },
  ];

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
    this.toast.show('info', 'Сброшено', 'Ограничения очищены');
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
            'Пусто',
            'Попробуйте убрать ограничения или добавьте избранное',
          );
        } else {
          this.toast.show('success', 'Готово', `Кандидатов: ${arr.length}`);
        }
      },
      error: () => {
        this.toast.show('error', 'Ошибка', 'Не удалось собрать кандидатов');
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
      this.toast.show('warning', 'Некого выбирать', 'Сначала соберите shortlist');
      return;
    }
    this.toast.show('success', 'Выбор сделан', w.title);
  }

  trackByMovieId(_: number, m: Movie): number {
    return m.id;
  }
}
