import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ErrorNotifierService } from '@core/error-notifier.service';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="banner" *ngIf="notifier.message() as msg">
      <span>{{ msg }}</span>
      <div class="actions">
        <button type="button" (click)="notifier.retry()">Повторить</button>
        <button type="button" (click)="notifier.clear()">Закрыть</button>
      </div>
    </section>
  `,
  styles: [
    `
      .banner {
        margin: 0.65rem 0;
        padding: 0.75rem 1rem;
        border: 1px solid var(--surface-error-border);
        border-radius: var(--radius-md);
        background: var(--surface-error-bg);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.85rem;
        font-size: 0.9rem;
        line-height: 1.45;
        box-shadow: var(--shadow-xs);
      }
      .actions {
        display: flex;
        gap: 0.45rem;
        flex-shrink: 0;
      }
      button {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-full);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
        color: var(--text);
        padding: 0.4rem 0.75rem;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.82rem;
        font-weight: 500;
        transition:
          background var(--duration-fast) var(--ease-out),
          border-color var(--duration-fast) var(--ease-out);
      }
      button:hover {
        background: color-mix(in srgb, var(--bg-elevated) 80%, transparent);
        border-color: var(--border-strong);
      }
    `,
  ],
})
export class ErrorBannerComponent {
  readonly notifier = inject(ErrorNotifierService);
}
