import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  computed,
  inject,
  input,
  Output,
} from '@angular/core';

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-segmented',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="radiogroup" [attr.aria-label]="ariaLabel()">
      <button
        class="seg__btn"
        type="button"
        *ngFor="let o of options(); trackBy: trackByValue"
        [class.seg__btn--active]="value() === o.value"
        [disabled]="o.disabled ?? false"
        role="radio"
        [attr.aria-checked]="value() === o.value"
        [attr.tabindex]="tabIndexFor(o.value)"
        [attr.data-seg-value]="o.value"
        (click)="onSelect(o.value)"
        (keydown)="onKeydown($event, o.value)"
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

      .seg__btn:focus-visible {
        outline: var(--focus-ring);
        outline-offset: 2px;
      }

      .seg__btn--active {
        color: var(--text);
        border-color: color-mix(in srgb, var(--accent-secondary) 45%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent-secondary) 14%, transparent);
      }

      .seg__btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none;
      }
    `,
  ],
})
export class SegmentedControlComponent<T extends string> {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly ariaLabel = input<string>('Options');
  readonly options = input<readonly SegmentedOption<T>[]>([]);
  readonly value = input<T | null>(null);
  readonly enabledOptions = computed(() => this.options().filter((o) => !(o.disabled ?? false)));

  @Output() readonly select = new EventEmitter<T>();

  trackByValue(_: number, o: SegmentedOption<T>): string {
    return o.value;
  }

  tabIndexFor(value: T): number {
    const current = this.value();
    if (current === value) return 0;
    if (current == null) {
      return this.enabledOptions()[0]?.value === value ? 0 : -1;
    }
    return -1;
  }

  onSelect(value: T): void {
    const option = this.options().find((o) => o.value === value);
    if (option?.disabled) return;
    this.select.emit(value);
  }

  onKeydown(event: KeyboardEvent, value: T): void {
    const enabled = this.enabledOptions();
    if (!enabled.length) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.onSelect(value);
      return;
    }

    const currentIndex = enabled.findIndex((o) => o.value === value);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      nextIndex = (currentIndex + 1) % enabled.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = enabled.length - 1;
    else return;

    event.preventDefault();
    const next = enabled[nextIndex]!;
    this.select.emit(next.value);
    queueMicrotask(() => this.focusOption(next.value));
  }

  private focusOption(value: T): void {
    const root = this.host.nativeElement as HTMLElement;
    const button = root.querySelector(`[data-seg-value="${value}"]`) as HTMLButtonElement | null;
    button?.focus();
  }
}
