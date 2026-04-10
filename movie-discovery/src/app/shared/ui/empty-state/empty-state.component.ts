import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="empty">
      <p class="empty__title">{{ title() }}</p>
      @if (subtitle(); as s) {
        <p class="empty__subtitle">{{ s }}</p>
      }
    </section>
  `,
  styles: [
    `
      .empty {
        padding: 2.75rem 1.5rem;
        text-align: center;
        border-radius: var(--radius-lg);
        border: 1px dashed var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
        color: var(--text-muted);
      }

      .empty__title {
        font-size: 1.08rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0 0 0.35rem;
        color: var(--text);
      }

      .empty__subtitle {
        font-size: 0.9rem;
        max-width: 44rem;
        margin: 0.5rem auto 0;
        line-height: 1.5;
        text-align: left;
        color: var(--text-muted);
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly title = input<string>('Ничего не найдено');
  readonly subtitle = input<string | null>(null);
}
