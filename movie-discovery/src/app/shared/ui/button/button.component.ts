import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      class="app-button"
      [class.app-button--primary]="variant() === 'primary'"
      [class.app-button--secondary]="variant() === 'secondary'"
      [class.app-button--ghost]="variant() === 'ghost'"
      [class.app-button--danger]="variant() === 'danger'"
      [class.app-button--icon]="variant() === 'icon'"
      [disabled]="disabled() || loading()"
      [attr.aria-disabled]="disabled() || loading()"
      [attr.aria-busy]="loading()"
      [attr.type]="type()"
    >
      @if (loading()) {
        <span class="spinner" aria-hidden="true"></span>
      }
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      .app-button {
        border: 1px solid transparent;
        border-radius: var(--radius-full);
        padding: 0.52rem 1.2rem;
        cursor: pointer;
        font-family: inherit;
        font-weight: 600;
        font-size: 0.95rem;
        letter-spacing: -0.02em;
        transition:
          transform var(--duration-fast) var(--ease-out),
          box-shadow var(--duration-fast) var(--ease-out),
          filter var(--duration-fast) var(--ease-out),
          background var(--duration-fast) var(--ease-out),
          border-color var(--duration-fast) var(--ease-out),
          opacity var(--duration-fast) var(--ease-out);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
      }

      .app-button--primary {
        border: none;
        background: linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%);
        color: var(--on-accent);
        box-shadow:
          var(--shadow-sm),
          0 0 24px var(--accent-glow);
      }

      .app-button--primary:hover:not(:disabled) {
        transform: translateY(-1px);
        filter: brightness(1.06) saturate(1.05);
        box-shadow:
          var(--shadow-md),
          0 0 28px var(--accent-glow);
      }

      .app-button--secondary {
        border-color: var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
        color: var(--text);
        box-shadow: var(--shadow-xs);
      }

      .app-button--secondary:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: var(--border-strong);
        background: color-mix(in srgb, var(--bg-elevated) 80%, transparent);
      }

      .app-button--ghost {
        border-color: var(--border-subtle);
        background: transparent;
        color: var(--text);
      }

      .app-button--ghost:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: var(--border-strong);
        background: color-mix(in srgb, var(--bg-elevated) 40%, transparent);
      }

      .app-button--danger {
        border: 1px solid color-mix(in srgb, var(--accent) 55%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        color: var(--text);
      }

      .app-button--danger:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--accent) 75%, var(--border-strong));
        background: color-mix(in srgb, var(--accent) 20%, transparent);
      }

      .app-button--icon {
        width: 40px;
        height: 40px;
        padding: 0;
        border-color: var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
        color: var(--text);
        box-shadow: var(--shadow-xs);
      }

      .app-button--icon:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: var(--border-strong);
        background: color-mix(in srgb, var(--bg-elevated) 80%, transparent);
      }

      .app-button:active:not(:disabled) {
        transform: translateY(0) scale(0.98);
        box-shadow: var(--shadow-xs);
      }

      .app-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
        filter: none;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border-radius: 9999px;
        border: 2px solid color-mix(in srgb, currentColor 25%, transparent);
        border-top-color: currentColor;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly isBusy = computed(() => this.disabled() || this.loading());
}
