import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  effect,
  inject,
  input,
  Output,
  viewChild,
} from '@angular/core';

import { I18nService } from '@shared/i18n/i18n.service';

let nextSheetTitleId = 0;

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="sheet" (click)="onBackdrop($event)" role="presentation">
        <div
          #panel
          class="sheet__panel"
          tabindex="-1"
          role="dialog"
          [attr.aria-modal]="true"
          [attr.aria-label]="title() ? null : ariaLabel()"
          [attr.aria-labelledby]="title() ? titleId : null"
          (click)="$event.stopPropagation()"
          (keydown)="onPanelKeydown($event)"
        >
          <header class="sheet__head">
            <div class="sheet__grab" aria-hidden="true"></div>
            <div class="sheet__titleRow">
              @if (title(); as t) {
                <h2 class="sheet__title" [id]="titleId">{{ t }}</h2>
              }
              <button
                #closeButton
                class="sheet__close"
                type="button"
                (click)="closed.emit()"
                [attr.aria-label]="closeLabel()"
              >
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
  private readonly doc = inject(DOCUMENT);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly i18n = inject(I18nService);
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly closeButtonRef = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  readonly open = input<boolean>(false);
  readonly title = input<string | null>(null);
  readonly ariaLabel = input<string>('Dialog');
  readonly closeOnBackdrop = input<boolean>(true);
  readonly closeOnEsc = input<boolean>(true);
  readonly initialFocusSelector = input<string | null>(null);
  readonly returnFocusTo = input<HTMLElement | null>(null);

  @Output() readonly closed = new EventEmitter<void>();

  readonly titleId = `bottom-sheet-title-${++nextSheetTitleId}`;

  private previousFocused: HTMLElement | null = null;
  private previousBodyOverflow = '';
  private readonly hiddenBackgroundState = new Map<
    HTMLElement,
    { ariaHidden: string | null; hadInert: boolean }
  >();

  constructor() {
    effect(() => {
      if (this.open()) {
        this.onOpen();
        return;
      }

      this.onClose();
    });
  }

  closeLabel(): string {
    return this.i18n.t('common.close');
  }

  onBackdrop(ev: MouseEvent): void {
    ev.preventDefault();
    if (!this.closeOnBackdrop()) return;
    this.closed.emit();
  }

  onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEsc()) {
      event.preventDefault();
      this.closed.emit();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = this.getFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      this.panelRef()?.nativeElement.focus();
      return;
    }

    const current = this.doc.activeElement as HTMLElement | null;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private onOpen(): void {
    const active = this.doc.activeElement;
    this.previousFocused = active instanceof HTMLElement ? active : null;

    if (this.doc.body) {
      this.previousBodyOverflow = this.doc.body.style.overflow;
      this.doc.body.style.overflow = 'hidden';
    }

    this.hideBackgroundFromAssistiveTech();
    queueMicrotask(() => this.focusInitialElement());
  }

  private onClose(): void {
    if (this.doc.body) {
      this.doc.body.style.overflow = this.previousBodyOverflow;
    }

    this.restoreBackgroundFromAssistiveTech();
    const target = this.returnFocusTo() ?? this.previousFocused;
    if (target && this.doc.contains(target)) {
      queueMicrotask(() => target.focus());
    }
  }

  private focusInitialElement(): void {
    const panel = this.panelRef()?.nativeElement;
    if (!panel) return;

    const selector = this.initialFocusSelector();
    if (selector) {
      const requested = panel.querySelector<HTMLElement>(selector);
      if (requested) {
        requested.focus();
        return;
      }
    }

    const closeButton = this.closeButtonRef()?.nativeElement;
    if (closeButton) {
      closeButton.focus();
      return;
    }

    panel.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    const panel = this.panelRef()?.nativeElement;
    if (!panel) return [];

    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return [...panel.querySelectorAll<HTMLElement>(selectors)].filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
    );
  }

  private hideBackgroundFromAssistiveTech(): void {
    let current: HTMLElement | null = this.hostRef.nativeElement;

    while (current?.parentElement) {
      const parent = current.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === current) continue;
        if (!this.hiddenBackgroundState.has(sibling)) {
          this.hiddenBackgroundState.set(sibling, {
            ariaHidden: sibling.getAttribute('aria-hidden'),
            hadInert: sibling.hasAttribute('inert'),
          });
        }
        sibling.setAttribute('aria-hidden', 'true');
        sibling.setAttribute('inert', '');
      }

      current = parent;
    }
  }

  private restoreBackgroundFromAssistiveTech(): void {
    for (const [element, previous] of this.hiddenBackgroundState) {
      if (previous.ariaHidden == null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', previous.ariaHidden);
      }

      if (previous.hadInert) {
        element.setAttribute('inert', '');
      } else {
        element.removeAttribute('inert');
      }
    }

    this.hiddenBackgroundState.clear();
  }
}
