import { ChangeDetectionStrategy, Component, EventEmitter, input, Output } from '@angular/core';

@Component({
  selector: 'app-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="chip"
      type="button"
      [class.chip--selected]="selected()"
      [disabled]="disabled()"
      [attr.aria-pressed]="selected()"
      (click)="clicked.emit()"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      .chip {
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
        color: var(--text);
        padding: 0.38rem 0.7rem;
        cursor: pointer;
        font: inherit;
        font-size: 0.85rem;
        line-height: 1.2;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        transition:
          transform var(--duration-fast) var(--ease-out),
          background var(--duration-fast) var(--ease-out),
          border-color var(--duration-fast) var(--ease-out),
          opacity var(--duration-fast) var(--ease-out);
      }

      .chip:hover:not(:disabled) {
        transform: translateY(-1px);
        background: color-mix(in srgb, var(--bg-elevated) 82%, transparent);
        border-color: var(--border-strong);
      }

      .chip--selected {
        border-color: color-mix(in srgb, var(--accent-secondary) 55%, var(--border-strong));
        background: color-mix(in srgb, var(--accent-secondary) 14%, transparent);
      }

      .chip:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
    `,
  ],
})
export class ChipComponent {
  readonly selected = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  @Output() readonly clicked = new EventEmitter<void>();
}
