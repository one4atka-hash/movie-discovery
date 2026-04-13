import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-diary-page',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="head">
        <h1 class="title">{{ i18n.t('nav.diary') }}</h1>
        <p class="sub">Здесь будет журнал просмотров: записи, теги, оценки и статистика.</p>
      </header>

      <app-empty-state
        title="Пока пусто"
        subtitle="Итерация 5.3: CRUD записей + timeline + импорт/экспорт. Начнём с формы “Log watch”."
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
export class DiaryPageComponent {
  readonly i18n = inject(I18nService);
}
