import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="empty">
      <p class="empty__title">{{ title() }}</p>
      <p class="empty__subtitle" *ngIf="subtitle() as s">{{ s }}</p>
    </section>
  `,
  styles: [
    `
      .empty {
        padding: 3rem 1.5rem;
        text-align: center;
        opacity: 0.7;
      }

      .empty__title {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .empty__subtitle {
        font-size: 0.9rem;
      }
    `
  ]
})
export class EmptyStateComponent {
  readonly title = input<string>('Ничего не найдено');
  readonly subtitle = input<string | null>(null);
}

