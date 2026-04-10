import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button class="app-button" type="button">
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      .app-button {
        border: none;
        border-radius: var(--radius-full);
        padding: 0.52rem 1.2rem;
        cursor: pointer;
        font-family: inherit;
        font-weight: 600;
        font-size: 0.95rem;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%);
        color: var(--on-accent);
        transition:
          transform var(--duration-fast) var(--ease-out),
          box-shadow var(--duration-fast) var(--ease-out),
          filter var(--duration-fast) var(--ease-out);
        box-shadow:
          var(--shadow-sm),
          0 0 24px var(--accent-glow);
      }

      .app-button:hover {
        transform: translateY(-1px);
        filter: brightness(1.06) saturate(1.05);
        box-shadow:
          var(--shadow-md),
          0 0 28px var(--accent-glow);
      }

      .app-button:active {
        transform: translateY(0) scale(0.98);
        box-shadow: var(--shadow-xs);
      }
    `,
  ],
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'ghost'>('primary');
}
