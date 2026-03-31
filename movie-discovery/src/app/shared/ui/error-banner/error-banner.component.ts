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
        margin: 0.5rem 0;
        padding: 0.65rem 0.8rem;
        border: 1px solid rgba(255, 107, 107, 0.35);
        border-radius: 12px;
        background: rgba(120, 20, 20, 0.25);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.8rem;
      }
      .actions {
        display: flex;
        gap: 0.4rem;
      }
      button {
        border: 1px solid var(--border-subtle);
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--text);
        padding: 0.35rem 0.65rem;
        cursor: pointer;
      }
    `
  ]
})
export class ErrorBannerComponent {
  readonly notifier = inject(ErrorNotifierService);
}

