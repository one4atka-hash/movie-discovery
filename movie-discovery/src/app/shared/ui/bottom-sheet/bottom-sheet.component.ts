import { ChangeDetectionStrategy, Component, EventEmitter, input, Output } from '@angular/core';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="sheet" (click)="onBackdrop($event)" role="presentation">
        <div
          class="sheet__panel"
          role="dialog"
          [attr.aria-modal]="true"
          [attr.aria-label]="ariaLabel()"
          (click)="$event.stopPropagation()"
        >
          <header class="sheet__head">
            <div class="sheet__grab" aria-hidden="true"></div>
            <div class="sheet__titleRow">
              @if (title(); as t) {
                <h2 class="sheet__title">{{ t }}</h2>
              }
              <button class="sheet__close" type="button" (click)="closed.emit()" aria-label="Close">
                ✕
              </button>
            </div>
          </header>
          <div class="sheet__body">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .sheet {
        position: fixed;
        inset: 0;
        z-index: 60;
        display: grid;
        align-items: end;
        background: rgba(0, 0, 0, 0.55);
        animation: sheetFade var(--duration-normal) var(--ease-out);
      }

      .sheet__panel {
        width: 100%;
        max-height: 88vh;
        overflow: auto;
        border-top-left-radius: var(--radius-xl);
        border-top-right-radius: var(--radius-xl);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
        box-shadow: var(--shadow-md);
        padding: 0.75rem 1rem 1rem;
      }

      .sheet__grab {
        width: 44px;
        height: 5px;
        border-radius: 9999px;
        background: color-mix(in srgb, var(--text-muted) 30%, transparent);
        margin: 0.15rem auto 0.55rem;
      }

      .sheet__titleRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .sheet__title {
        margin: 0;
        font-size: 1.05rem;
        letter-spacing: -0.02em;
      }

      .sheet__close {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        background: transparent;
        color: var(--text);
        cursor: pointer;
      }

      .sheet__close:hover {
        border-color: var(--border-strong);
        background: color-mix(in srgb, var(--bg-elevated) 65%, transparent);
      }

      .sheet__body {
        padding-top: 0.8rem;
      }

      @keyframes sheetFade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class BottomSheetComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string | null>(null);
  readonly ariaLabel = input<string>('Dialog');

  @Output() readonly closed = new EventEmitter<void>();

  onBackdrop(ev: MouseEvent): void {
    ev.preventDefault();
    this.closed.emit();
  }
}
