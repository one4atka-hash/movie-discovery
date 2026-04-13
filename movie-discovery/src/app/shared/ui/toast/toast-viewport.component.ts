import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-viewport',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="toasts" aria-label="Notifications">
      <article
        class="toast"
        *ngFor="let t of toast.items(); trackBy: trackById"
        [class.toast--info]="t.kind === 'info'"
        [class.toast--success]="t.kind === 'success'"
        [class.toast--warning]="t.kind === 'warning'"
        [class.toast--error]="t.kind === 'error'"
      >
        <div class="toast__body">
          <strong class="toast__title">{{ t.title }}</strong>
          <p class="toast__msg" *ngIf="t.message">{{ t.message }}</p>
        </div>
        <button class="toast__x" type="button" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
          ✕
        </button>
      </article>
    </section>
  `,
  styles: [
    `
      .toasts {
        position: fixed;
        z-index: 70;
        bottom: 16px;
        left: 16px;
        right: 16px;
        display: grid;
        gap: 0.6rem;
        pointer-events: none;
      }

      @media (min-width: 720px) {
        .toasts {
          left: auto;
          right: 18px;
          max-width: 360px;
        }
      }

      .toast {
        pointer-events: auto;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
        box-shadow: var(--shadow-sm);
        padding: 0.75rem 0.75rem 0.75rem 0.9rem;
        display: flex;
        justify-content: space-between;
        gap: 0.65rem;
        animation: toastIn var(--duration-normal) var(--ease-out);
      }

      .toast--success {
        border-color: color-mix(in srgb, #22c55e 35%, var(--border-subtle));
      }
      .toast--warning {
        border-color: var(--surface-warning-border);
      }
      .toast--error {
        border-color: var(--surface-error-border);
      }

      .toast__title {
        display: block;
        margin: 0;
        letter-spacing: -0.02em;
      }

      .toast__msg {
        margin: 0.25rem 0 0;
        color: var(--text-muted);
        font-size: 0.9rem;
        line-height: 1.35;
      }

      .toast__x {
        width: 34px;
        height: 34px;
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        background: transparent;
        color: var(--text);
        cursor: pointer;
        flex: 0 0 auto;
      }

      .toast__x:hover {
        border-color: var(--border-strong);
        background: color-mix(in srgb, var(--bg-elevated) 65%, transparent);
      }

      @keyframes toastIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
    `,
  ],
})
export class ToastViewportComponent {
  readonly toast = inject(ToastService);

  trackById(_: number, t: { id: string }): string {
    return t.id;
  }
}
