import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { ChipComponent } from '@shared/ui/chip/chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';

@Component({
  selector: 'app-decision-page',
  standalone: true,
  imports: [
    RouterLink,
    EmptyStateComponent,
    CardComponent,
    ChipComponent,
    ButtonComponent,
    BottomSheetComponent,
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
          <app-button (click)="build()">Собрать shortlist</app-button>
        </div>
      </app-card>

      <app-bottom-sheet
        [open]="openMore()"
        title="Ещё ограничения"
        ariaLabel="More constraints"
        (closed)="openMore.set(false)"
      >
        <p class="muted">
          Здесь будет выбор: мои сервисы, язык, возрастной рейтинг, рейтинг ≥ X и пресеты.
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

      <app-empty-state
        title="Shortlist пока не реализован"
        subtitle="Следующий шаг: карточки кандидатов + режим Roulette/Top 5 + экран Winner."
      >
        <a class="btn" routerLink="/">← {{ i18n.t('nav.home') }}</a>
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

  readonly openMore = signal(false);
  readonly maxMinutes = signal<number | null>(110);
  readonly genre = signal<'thriller' | 'comedy' | 'drama' | null>(null);

  setMaxMinutes(v: number): void {
    this.maxMinutes.set(this.maxMinutes() === v ? null : v);
  }

  setGenre(v: 'thriller' | 'comedy' | 'drama'): void {
    this.genre.set(this.genre() === v ? null : v);
  }

  reset(): void {
    this.maxMinutes.set(null);
    this.genre.set(null);
    this.toast.show('info', 'Сброшено', 'Ограничения очищены');
  }

  build(): void {
    this.toast.show('success', 'Собрано', 'Shortlist появится в следующей итерации UI');
  }
}
