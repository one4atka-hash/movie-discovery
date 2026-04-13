import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="b" [class]="classes()">
      <ng-content></ng-content>
    </span>
  `,
  styles: [
    `
      .b {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.03);
        color: var(--text-muted);
        white-space: nowrap;
      }

      .b--sm {
        padding: 0.15rem 0.45rem;
        font-size: 0.78rem;
        line-height: 1.1;
      }

      .b--md {
        padding: 0.2rem 0.55rem;
        font-size: 0.82rem;
        line-height: 1.1;
      }

      .b--muted {
        color: var(--text-faint);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
      }

      .b--accent {
        border-color: color-mix(in srgb, var(--accent-secondary) 45%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent-secondary) 10%, transparent);
        color: color-mix(in srgb, var(--accent-secondary) 82%, white);
      }

      .b--success {
        border-color: color-mix(in srgb, #3ddc97 40%, var(--border-subtle));
        background: color-mix(in srgb, #3ddc97 10%, transparent);
        color: color-mix(in srgb, #3ddc97 75%, white);
      }

      .b--warning {
        border-color: color-mix(in srgb, #ffb020 50%, var(--border-subtle));
        background: color-mix(in srgb, #ffb020 10%, transparent);
        color: color-mix(in srgb, #ffb020 72%, white);
      }

      .b--danger {
        border-color: color-mix(in srgb, #ff6b6b 45%, var(--border-subtle));
        background: color-mix(in srgb, #ff6b6b 10%, transparent);
        color: color-mix(in srgb, #ff6b6b 80%, white);
      }
    `,
  ],
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('default');
  readonly size = input<BadgeSize>('md');

  classes(): string {
    return `b b--${this.size()} b--${this.variant()}`;
  }
}
