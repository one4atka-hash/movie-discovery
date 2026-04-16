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
      <div class="empty__actions">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [
    `
      .empty {
        padding: calc(var(--space-6) + var(--space-3)) var(--space-5);
        text-align: center;
        border-radius: var(--radius-lg);
        border: 1px dashed var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
        color: var(--text-muted);
      }

      .empty__title {
        font-size: var(--font-size-title-sm);
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0 0 var(--space-1);
        color: var(--text);
      }

      .empty__subtitle {
        font-size: var(--font-size-body);
        max-width: 44rem;
        margin: var(--space-2) auto 0;
        line-height: 1.5;
        text-align: left;
        color: var(--text-muted);
      }

      .empty__actions {
        margin-top: var(--space-4);
        display: flex;
        gap: var(--space-2);
        justify-content: center;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly title = input<string>('Ничего не найдено');
  readonly subtitle = input<string | null>(null);
}
