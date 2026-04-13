import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card" [class.card--muted]="variant() === 'muted'">
      @if (title(); as t) {
        <header class="card__head">
          <h2 class="card__title">{{ t }}</h2>
          <div class="card__actions">
            <ng-content select="[cardActions]"></ng-content>
          </div>
        </header>
      }
      <div class="card__body">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [
    `
      .card {
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
        box-shadow: var(--shadow-xs);
        padding: 0.95rem;
      }

      .card--muted {
        background: color-mix(in srgb, var(--bg-muted) 45%, transparent);
      }

      .card__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .card__title {
        margin: 0;
        font-size: 1.05rem;
        letter-spacing: -0.02em;
      }

      .card__actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .card__body {
        min-width: 0;
      }
    `,
  ],
})
export class CardComponent {
  readonly title = input<string | null>(null);
  readonly variant = input<'default' | 'muted'>('default');
}
