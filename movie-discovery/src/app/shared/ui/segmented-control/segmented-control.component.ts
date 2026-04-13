import { ChangeDetectionStrategy, Component, EventEmitter, input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

@Component({
  selector: 'app-segmented',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="group" [attr.aria-label]="ariaLabel()">
      <button
        class="seg__btn"
        type="button"
        *ngFor="let o of options(); trackBy: trackByValue"
        [class.seg__btn--active]="value() === o.value"
        [attr.aria-pressed]="value() === o.value"
        (click)="select.emit(o.value)"
      >
        {{ o.label }}
      </button>
    </div>
  `,
  styles: [
    `
      .seg {
        display: inline-flex;
        gap: 0.25rem;
        padding: 0.25rem;
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
      }

      .seg__btn {
        border-radius: var(--radius-full);
        border: 1px solid transparent;
        background: transparent;
        color: var(--text-muted);
        padding: 0.4rem 0.7rem;
        cursor: pointer;
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        transition:
          background var(--duration-fast) var(--ease-out),
          border-color var(--duration-fast) var(--ease-out),
          color var(--duration-fast) var(--ease-out),
          transform var(--duration-fast) var(--ease-out);
      }

      .seg__btn:hover {
        transform: translateY(-1px);
        color: var(--text);
      }

      .seg__btn--active {
        color: var(--text);
        border-color: color-mix(in srgb, var(--accent-secondary) 45%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent-secondary) 14%, transparent);
      }
    `,
  ],
})
export class SegmentedControlComponent<T extends string> {
  readonly ariaLabel = input<string>('Options');
  readonly options = input<readonly SegmentedOption<T>[]>([]);
  readonly value = input<T | null>(null);

  @Output() readonly select = new EventEmitter<T>();

  trackByValue(_: number, o: SegmentedOption<T>): string {
    return o.value;
  }
}
